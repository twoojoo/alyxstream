'use strict'

import { Task, ExtendTaskV2, ExtendTaskRawV2 } from '../index.js'

ExtendTaskV2("sumAndFilterOdd", (first, next, a1, a2) => {
  const result = first + a1 + a2

  if (result % 2 === 0) {
    next(result)
  }
})

test('extendv2', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .sumAndFilterOdd(10, 20)
    .fn(x => expect(x % 2).toBe(0))
    .close()
})

ExtendTaskRawV2("sumAndFilterOddRaw", (first, next, a1, a2) => {
  first.payload = first.payload + a1 + a2

  if (first.payload % 2 === 0) {
    next(first)
  }
})

test('extendv2raw', async () => {
  await Task()
    .fromArray([1, 2, 3, 4, 5])
    .sumAndFilterOddRaw(10, 20)
    .fn(x => expect(x % 2).toBe(0))
    .close()
})