'use strict'

import { Task } from '../index.js'

test('select', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .select(async (x, next) => {
      if (x % 2 === 0) {
        await next(x)
      }
    })
    .fn(x => expect(x % 2).toBe(0))
    .close()
})

test('selectRaw', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .selectRaw(async (x, next) => {
      if (x.payload % 2 === 0) {
        await next(x)
      }
    })
    .fn(x => expect(x % 2).toBe(0))
    .close()
})