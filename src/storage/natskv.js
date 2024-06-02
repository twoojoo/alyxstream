'use strict'

import { JSONCodec } from "nats";

const defaultCodec = JSONCodec();

export function Make(config, id) {
  const db = config ? config.kv : null
  const codec = config ? config.codec : defaultCodec

  return {
    _db: db,
    state: {},
    _id: id,

    db: async function () {
      return this.db
    },

    watch: async function (key, cb) {
      try {
        const watch = await db.watch({ key });

        (async () => {
          for await (const e of watch) {
            e.decoded = await codec.decode(e.value)
            await cb(e)
          }
        })().finally()
      } catch (error) {
        console.log(error)
        return null
      }
    },

    put: async function (key, value) {
      try {
        const valueRes = await db.put(key, codec.encode(value))
        return valueRes
      } catch (error) {
        console.log(error)
        return null
      }
    },

    set: async function (key, value) {
      try {
        const valueRes = await db.put(key, codec.encode(value))
        return valueRes
      } catch (error) {
        console.log(error)
        return null
      }
    },

    get: async function (key) {
      try {
        const e = await db.get(key)
        return codec.decode(e.value)
      } catch (error) {
        console.log(error)
        return null
      }
    },

    flush: async function (key, value) {
      await db.delete(key) // should use purge instead?
      return null
    }
  }
}
