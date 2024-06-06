import { Task } from "../index";
import crypto from "crypto"

test('parallelize', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelize(async x => {
			const resp = await fetch("http://google.it?search=" + x)

			return crypto.createHash('sha256')
				.update(await resp.text())
				.digest('hex')
		})
		.tap(x => expect(x.length).toBe(input.length))
		.each()
		.tap(x => expect(x.length).toBe(64)) // sha256 hex
		.close()
})

test('parallelize.with.chunks', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelize(async x => {
			const resp = await fetch("http://google.it?search=" + x)

			return crypto.createHash('sha256')
				.update(await resp.text())
				.digest('hex')
		}, 5)
		.tap(x => expect(x.length).toBe(input.length))
		.each()
		.tap(x => expect(x.length).toBe(64))
		.close()
})

test('parallelize.with.chunks.flush', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelize(async x => {
			const resp = await fetch("http://google.it?search=" + x)

			return crypto.createHash('sha256')
				.update(await resp.text())
				.digest('hex')
		}, 5, true)
		.tap(x => expect(x.length > 5).toBe(false))
		.each()
		.tap(x => expect(x.length).toBe(64))
		.close()
})

test('parallelize.catch', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelizeCatch(async x => {
			if (x % 2 == 1) throw Error("odd")
			return x
		}, (e, x) => x - 1)
		.tap(x => expect(x.length).toBe(input.length))
		.print()
		.each()
		.tap(x => expect(x % 2).toBe(0))
		.close()
})

test('parallelize.catch.chunks', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelizeCatch(async x => {
			if (x % 2 == 1) throw Error("odd")
			return x
		}, (e, x) => x - 1, 5)
		.tap(x => expect(x.length).toBe(input.length))
		.print()
		.each()
		.tap(x => expect(x % 2).toBe(0))
		.close()
})

test('parallelize.catch.chunks.flush', async () => {
	const input = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

	await Task()
		.fromObject(input)
		.parallelizeCatch(async x => {
			if (x % 2 == 1) throw Error("odd")
			return x
		}, (e, x) => x - 1, 5, true)
		.tap(x => expect(x.length).toBe(5))
		.print()
		.each()
		.tap(x => expect(x % 2).toBe(0))
		.close()
})