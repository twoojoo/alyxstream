'use strict'

import { Task } from '../index.js'

test('control', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .control(async (x, next) => {
      if (x % 2 === 0) {
        await next(x)
      }
    })
    .fn(x => expect(x % 2).toBe(0))
    .close()
})

test('controlRaw', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .controlRaw(async (x, next) => {
      if (x.payload % 2 === 0) {
        await next(x)
      }
    })
    .fn(x => expect(x % 2).toBe(0))
    .close()
})

test('controlPromises', async () => {
  await Task()
    .fromObject(1)
    .control(async (x, next) => {
      const promises = []

      for (let i = 0; i < 5; i++) {
        promises.push(next(x + i))
      }

      await Promise.all(promises)
    })
    .fn(async x => {
        console.log(x)
    })  
    .close()
})