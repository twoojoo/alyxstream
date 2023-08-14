'use strict'

import Message from '../message/message.js'

let triggerTimeout = {}

export async function set (task, index, baseWindow, key, ms) {
	clearTimeout(triggerTimeout[key])
  	const check = () => {
  		return new Promise((resolve, reject) => {
    	triggerTimeout[key] = setTimeout(() => {
      		resolve()
    	}, ms)
  	})}
  	await check()
  	const winres = await baseWindow.onInactivityEmit(key) 
  	await task._nextAtIndex(index)(Message(winres.payload, winres.metadata))
}

export function unset (key) {
	clearTimeout(triggerTimeout[key])	
	delete triggerTimeout[key]
}