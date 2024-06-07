'use strict'

import cluster from 'node:cluster'
import Message from '../message/message.js'
import Log from '../logger/default.js'

export const parallel = {
  parallel(numberOfProcess, produceFunction = null) {
    const task = this
    const index = task._nextIndex()

    if (cluster.isPrimary) {
      for (let i = 0; i < numberOfProcess; i++) {
        Log('debug', ['Forking process', i])
        cluster.fork()
      }
      cluster.on('exit', (worker, code, signal) => {
        Log('debug', ['Process is dead'])
        cluster.fork()
        Log('debug', ['Forking process'])
      })
    }
    task._setNext(async () => {
      if (cluster.isPrimary && produceFunction !== null) {
        await produceFunction()
      }
      if (!cluster.isPrimary) {
        await task._nextAtIndex(index)(Message(null))
      }
    })
    return task
  },

  parallelize(cb, maxChunkSize = Infinity, flushSingleChunks = false) {
    const task = this
    const index = task._nextIndex()

    if (maxChunkSize < 1) {
      throw Error("maxSize must be > 1 in parallelize operator")
    }

    task._setNext(async (s) => {
      if (!Array.isArray(s.payload)) {
        throw Error("parallelize operator requires an array")
      }

      const chunks = []
      for (let i = 0; i < s.payload.length; i += maxChunkSize) {
        const chunk = s.payload.slice(i, i + maxChunkSize);
        chunks.push(chunk);
      }

      let results = []
      for (let i = 0; i < chunks.length; i++) {
        const jobs = []

        for (let j = 0; j < chunks[i].length; j++) {
          jobs[j] = new Promise(async (resolve, reject) => {
            try {
              const r = await cb(chunks[i][j], j, chunks[i])
              resolve(r)
            } catch (e) {
              reject(e)
            }
          })
        }

        const result = await Promise.all(jobs)

        if (flushSingleChunks) {
          await task._nextAtIndex(index)(Message(result, s.metadata, s.globalState))
        } else {
          results[i] = result
        }
      }

      if (!flushSingleChunks) {
        results = results.flat()
        await task._nextAtIndex(index)(Message(results, s.metadata, s.globalState))
      }
    })
    return task
  },

  parallelizeCatch(cb, onError, maxChunkSize = Infinity, flushSingleChunks = false, keepErrors = false) {
    const task = this
    const index = task._nextIndex()

    if (maxChunkSize < 1) {
      throw Error("maxSize must be > 1 in parallelize operator")
    }

    task._setNext(async (s) => {
      if (!Array.isArray(s.payload)) {
        throw Error("parallelize operator requires an array")
      }

      const chunks = []
      for (let i = 0; i < s.payload.length; i += maxChunkSize) {
        const chunk = s.payload.slice(i, i + maxChunkSize);
        chunks.push(chunk);
      }

      let results = []
      for (let i = 0; i < chunks.length; i++) {
        const jobs = []

        for (let j = 0; j < chunks[i].length; j++) {
          jobs[j] = new Promise(async (resolve, reject) => {
            try {
              const r = await cb(chunks[i][j])
              resolve(r)
            } catch (e) {
              reject(e)
            }
          })
        }

        let r = await Promise.allSettled(jobs)

        const result = []
        for (let j = 0; j < r.length; j++) {
          if (r[j].status == "rejected") {
            const value = await onError(r[j].reason, chunks[i][j], j, chunks[i])
            if (keepErrors) result.push(value)
          } else {
            result.push(r[j].value)
          }
        }

        if (flushSingleChunks) {
          await task._nextAtIndex(index)(Message(result, s.metadata, s.globalState))
        } else {
          results[i] = result
        }
      }

      if (!flushSingleChunks) {
        results = results.flat()
        await task._nextAtIndex(index)(Message(results, s.metadata, s.globalState))
      }
    })
    return task
  },

  race(cb) {
    const task = this
    const index = task._nextIndex()

    task._setNext(async (s) => {
      if (!Array.isArray(s.payload)) {
        throw Error("parallelize operator requires an array")
      }

      const jobs = []
      for (let j = 0; j < s.payload.length; j++) {
        jobs[j] = new Promise(async (resolve, reject) => {
          try {
            const r = await cb(s.payload[j])
            resolve(r)
          } catch (e) {
            reject(e)
          }
        })
      }

      try {
        const value = await Promise.race(jobs)
        await task._nextAtIndex(index)(Message(value, s.metadata, s.globalState))
      } catch (e) {
        throw e
      }
    })
    return task
  },

  raceCatch(cb, onError, keepErrors = false) {
    const task = this
    const index = task._nextIndex()

    task._setNext(async (s) => {
      if (!Array.isArray(s.payload)) {
        throw Error("parallelize operator requires an array")
      }

      const jobs = []
      for (let j = 0; j < s.payload.length; j++) {
        jobs[j] = new Promise(async (resolve, reject) => {
          try {
            const r = await cb(s.payload[j])
            resolve(r)
          } catch (e) {
            reject(e)
          }
        })
      }

      try {
        const value = await Promise.race(jobs)
        await task._nextAtIndex(index)(Message(value, s.metadata, s.globalState))
      } catch (e) {
        const value = await onError(e, s.payload)
        if (keepErrors) {
          await task._nextAtIndex(index)(Message(value, s.metadata, s.globalState))
        }
      }
    })
    return task
  }
}
