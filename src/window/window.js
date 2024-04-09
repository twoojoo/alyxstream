'use strict'

import { v4 as uuid } from 'uuid'

function makeBaseWindow (storage) {
  return {
    _storage: storage,

    _windowMetadata: {},

    _load: async function (key) {
      if (this._windowMetadata[key] === undefined) {
        this._windowMetadata[key] = await this._storage.getMetadata(key)
      }
      // Not present in storage
      if (this._windowMetadata[key] === undefined || this._windowMetadata[key] === null) {
        this._windowMetadata[key] = {
          windowElements: 0
        }
      }
      return this._windowMetadata[key]
    },

    _unload: async function (key) {
      delete this._windowMetadata[key]
    },

    _getMetadata: async function (key) {
      return await this._load(key)
    },

    _updateMetadataOnPush: async function (key, windowMetadata = null) {
      const metadata = await this._getMetadata(key)
      if (metadata.windowElements === undefined) {
        metadata.windowElements = 0
      }
      if (windowMetadata !== null) {
        Object.keys(windowMetadata).forEach(x => {
          metadata[x] = windowMetadata[x]
        })
      }
      metadata.windowElements += 1
    },

    push: async function (key, value, windowMetadata = null) {},

    getCurrent: async function (key) {
      return (await this._storage.getList(key))
    },

    setMetadata: async function (key, windowMetadata) {
      this._windowMetadata[key] = windowMetadata
    },

    writeMetadata: async function (key) {
      await this._storage.setMetadata(key, this._windowMetadata[key])
    },

    close: async function (key, value) {
      const toReturn = (await this._storage.getList(key))
      await this._beforeEmit(key)
      return toReturn
    },

    onInactivityEmit: async function () {},

    size: async function (key) {
      return (await this._getMetadata(key)).windowElements
    },

    flush: async function (key) {
      await this._storage.flush(key)
      await this._unload(key)
    },

    flushWindow: async function (key) {
      await this._storage.flushWindow(key)
    }
  }
}

export function MakeWindowTumblingCount (storage) {
  const baseWindow = makeBaseWindow(storage)

  baseWindow.push = async function (key, value, windowMetadata = null) {
    await this._getMetadata(key)
    await this._updateMetadataOnPush(key, windowMetadata)
    await this._storage.push(key, await this._getMetadata(key), value)
    const size = await baseWindow.size(key)
    if (size >= windowMetadata.maxSize) {
      const winres = (await this._storage.getList(key))
      await baseWindow.flush(key)
      return {
        payload: winres,
        metadata: {
          windowKey: key,
          startTime: null,
          endTime: null,
          windowTimeInSeconds: null,
          windowTimeInMinutes: null,
          windowTimeInHours: null,
          windowElements: winres == null ? [] : winres.length
        }
      }
    } else {
      return null
    }
  }

  baseWindow.onInactivityEmit = async function (key) {
    const winres = (await this._storage.getList(key))
    await baseWindow.flush(key)
    return {
      payload: winres,
      metadata: {
        windowKey: key,
        startTime: null,
        endTime: null,
        windowTimeInSeconds: null,
        windowTimeInMinutes: null,
        windowTimeInHours: null,
        windowElements: winres === null ? [] : winres.length
      }
    }
  }

  return baseWindow
}

export function MakeWindowTumblingTime (storage) {
  const baseWindow = makeBaseWindow(storage)

  baseWindow.push = async function (key, value, newMetadata) {
    const currentMetadata = await this._getMetadata(key)
    if (currentMetadata.startTimestamp === undefined || currentMetadata.startTimestamp === null) {
      if (currentMetadata.eventTime !== undefined &&
        currentMetadata.eventTime !== null &&
        currentMetadata.eventTime > newMetadata.eventTime) {
        // Do not open/push if there was a previus window with watermark > current eventTime
        return null
      }
      // new window
      await this._updateMetadataOnPush(key, newMetadata)
      await this._storage.push(key, await this._getMetadata(key), value)
      return null
    } else if (newMetadata.eventTime >= currentMetadata.startTimestamp &&
      newMetadata.eventTime < currentMetadata.endTimestamp) {
      // push inside current window
      await this._updateMetadataOnPush(key, newMetadata)
      await this._storage.push(key, await this._getMetadata(key), value)
      return null
    } else if (newMetadata.eventTime > currentMetadata.endTimestamp) {
      // emit current window and push in the new one
      const winres = (await this._storage.getList(key))
      let newMetadataUpdated = {
        startTimestamp: newMetadata.startTimestamp,
        endTimestamp: newMetadata.endTimestamp,
        eventTime: newMetadata.eventTime,
        windowElements: 0
      }
      await this._updateMetadataOnPush(key, newMetadataUpdated)
      newMetadataUpdated = baseWindow._getMetadata(key)
      await baseWindow.setMetadata(newMetadataUpdated)
      await baseWindow.flushWindow(key)
      await this._storage.push(key, newMetadataUpdated, value)
      return {
        payload: winres,
        metadata: {
          windowKey: key,
          startTime: new Date(currentMetadata.startTimestamp),
          endTime: new Date(currentMetadata.endTimestamp),
          windowTimeInSeconds: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000,
          windowTimeInMinutes: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60,
          windowTimeInHours: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60 / 60,
          windowElements: winres === null ? [] : winres.length
        }
      }
    } else {
      return null
    }
  }

  baseWindow.onInactivityEmit = async function (key) {
    const winres = (await this._storage.getList(key))
    const currentMetadata = await this._getMetadata(key)
    const newMetadataUpdated = {
      startTimestamp: null,
      endTimestamp: null,
      eventTime: currentMetadata.endTimestamp,
      windowElements: 0
    }
    await baseWindow.setMetadata(key, newMetadataUpdated)
    await baseWindow.writeMetadata(key)
    await this._unload(key)
    await baseWindow.flushWindow(key)
    return winres
  }

  return baseWindow
}

export function MakeWindowSlidingCount (storage) {
  const baseWindow = makeBaseWindow(storage)

  baseWindow.push = async function (key, value, windowMetadata = null) {
    await this._getMetadata(key)
    await this._updateMetadataOnPush(key, windowMetadata)
    await this._storage.push(key, await this._getMetadata(key), value)
    const size = await baseWindow.size(key)
    if (size === windowMetadata.maxSize) {
      const winres = (await this._storage.getList(key))
      return {
        payload: winres,
        metadata: {
          windowKey: key,
          startTime: null,
          endTime: null,
          windowTimeInSeconds: null,
          windowTimeInMinutes: null,
          windowTimeInHours: null,
          windowElements: winres
        }
      }
    } else if (size === windowMetadata.maxSize + windowMetadata.slideSize) {
      // remove windowMetadata.slideSize elements from head
      const winres = (await this._storage.sliceCountAndGet(key, windowMetadata.slideSize))
      const newMetadataUpdated = {
        windowElements: windowMetadata.maxSize
      }
      await baseWindow.setMetadata(key, newMetadataUpdated)
      await baseWindow.writeMetadata(key)
      await this._unload(key)
      return {
        payload: winres,
        metadata: {
          windowKey: key,
          startTime: null,
          endTime: null,
          windowTimeInSeconds: null,
          windowTimeInMinutes: null,
          windowTimeInHours: null,
          windowElements: winres === null ? [] : winres.length
        }
      }
    } else {
      return null
    }
  }

  baseWindow.onInactivityEmit = async function (key) {
    const winres = (await this._storage.getList(key))
    await baseWindow.flush(key)
    return {
      payload: winres,
      metadata: {
        windowKey: key,
        startTime: null,
        endTime: null,
        windowTimeInSeconds: null,
        windowTimeInMinutes: null,
        windowTimeInHours: null,
        windowElements: winres === null ? [] : winres.length
      }
    }
  }

  return baseWindow
}

export function MakeWindowSlidingTime (storage) {
  const baseWindow = makeBaseWindow(storage)

  baseWindow.push = async function (key, value, newMetadata = null) {
    const currentMetadata = await this._getMetadata(key)
    if (currentMetadata.startTimestamp === undefined || currentMetadata.startTimestamp === null) {
      if (currentMetadata.eventTime !== undefined &&
        currentMetadata.eventTime !== null &&
        currentMetadata.eventTime > newMetadata.eventTime) {
        // Do not open/push if there was a previus window with watermark > current eventTime
        return null
      }
      // new window
      await this._updateMetadataOnPush(key, newMetadata)
      await this._storage.push(key, await this._getMetadata(key), value)
      return null
    } else if (newMetadata.eventTime >= currentMetadata.startTimestamp &&
      newMetadata.eventTime < currentMetadata.endTimestamp) {
      // push inside current window
      await this._updateMetadataOnPush(key, currentMetadata)
      await this._storage.push(key, await this._getMetadata(key), value)
      return null
    } else if (newMetadata.eventTime > currentMetadata.endTimestamp) {
      // emit current window and push in the new one
      const startTimestamp = currentMetadata.startTimestamp + newMetadata.slideSize
      const endTimestamp = currentMetadata.endTimestamp + newMetadata.slideSize
      // console.log((await this._storage.getList(key)))
      const winres = (await this._storage.getList(key)).map(x => x.element)

      const newMetadataUpdated = {
        startTimestamp,
        endTimestamp,
        eventTime: newMetadata.eventTime,
        windowElements: winres.length + 1
      }

      await baseWindow.setMetadata(key, newMetadataUpdated)
      await baseWindow.writeMetadata(key)
      await this._storage.sliceTime(key, startTimestamp)
      await this._storage.push(key, newMetadataUpdated, value)
      await this._unload(key)
      return {
        payload: winres,
        metadata: {
          windowKey: key,
          startTime: new Date(currentMetadata.startTimestamp),
          endTime: new Date(currentMetadata.endTimestamp),
          windowTimeInSeconds: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000,
          windowTimeInMinutes: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60,
          windowTimeInHours: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60 / 60,
          windowElements: winres == null ? [] : winres.length
        }
      }
    } else {
      return null
    }
  }

  baseWindow.onInactivityEmit = async function (key) {
    const winres = (await this._storage.getList(key))
    const currentMetadata = await this._getMetadata(key)
    const newMetadataUpdated = {
      startTimestamp: null,
      endTimestamp: null,
      eventTime: currentMetadata.endTimestamp,
      windowElements: 0
    }
    await baseWindow.setMetadata(key, newMetadataUpdated)
    await baseWindow.writeMetadata(key)
    await this._unload(key)
    await baseWindow.flushWindow(key)
    return {
      payload: winres,
      metadata: {
        windowKey: key,
        startTime: new Date(currentMetadata.startTimestamp),
        endTime: new Date(currentMetadata.endTimestamp),
        windowTimeInSeconds: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000,
        windowTimeInMinutes: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60,
        windowTimeInHours: (new Date(currentMetadata.endTimestamp) - new Date(currentMetadata.startTimestamp)) / 1000 / 60 / 60,
        windowElements: winres == null ? [] : winres.length
      }
    }
  }

  return baseWindow
}

export function MakeSessionWindow (storage) {
  const baseWindow = makeBaseWindow(storage)

  baseWindow.push = async function (key, value, newMetadata) {
    await this._storage.push(key, await this._getMetadata(key), value)
    return null
  }

  baseWindow.onInactivityEmit = async function (key) {
    const winres = (await this._storage.getList(key))
    await this._unload(key)
    await baseWindow.flushWindow(key)
    return {
      payload: winres,
      metadata: {
        windowKey: key,
        startTime: null,
        endTime: null,
        windowTimeInSeconds: null,
        windowTimeInMinutes: null,
        windowTimeInHours: null,
        windowElements: winres == null ? [] : winres.length
      }
    }
  }

  return baseWindow
}

export function MakeWindowFixed (storage) {
  const baseWindow = {}
  const db = storage.db()
  const storageId = storage.id()
  const pushQuery = `
    INSERT INTO 
      alyxstream.fixed_window (id, key, s_uuid, wid, value) 
    VALUES 
      (?,?,now(),?,?)`
  const countQuery = 'SELECT COUNT(id) FROM alyxstream.fixed_window WHERE id=? AND key=?'
  const selectLastQuery = 'SELECT wid FROM alyxstream.fixed_window WHERE id=? AND key=? LIMIT 1'
  const selectQuery = 'SELECT value FROM alyxstream.fixed_window WHERE id=? AND key=?'
  const deleteQuery = 'DELETE FROM alyxstream.fixed_window WHERE id=? AND key=?'

  baseWindow.push = async function (key, value, maxSize) {
    const writeId = uuid()
    await db.execute(pushQuery, [storageId, key, writeId, JSON.stringify(value)])
    const size = await db.execute(countQuery, [storageId, key])
    const sizeCountLow = size.rows[0]['system.count(id)'].low
    if (sizeCountLow >= maxSize) {
      const lastCheck = await db.execute(selectLastQuery, [storageId, key])
      const lastWriteWid = lastCheck.rows[0].wid.toString()
      if (lastWriteWid === writeId) {
        const data = (await db.execute(selectQuery, [storageId, key])).rows
        await db.execute(deleteQuery, [storageId, key])
        return {
          payload: data
        }
      }
    }
    return null
  }

  return baseWindow
}
