/* eslint-disable @stylistic/indent */

/**
 * @license
 * Copyright 2020 The Emscripten Authors
 * SPDX-License-Identifier: MIT
 */

// port from emscripten src/lib/libaddfunction.js

import { from64, to64 } from 'emscripten:parse-tools'
import { wasmTable, getWasmTableEntry, setWasmTableEntry } from 'emscripten:runtime'

// This gives correct answers for everything less than 2^{14} = 16384
// I hope nobody is contemplating functions with 16384 arguments...
function uleb128EncodeWithLen (arr: number[]): number[] {
  const n = arr.length
  // Note: this LEB128 length encoding produces extra byte for n < 128,
  // but we don't care as it's only used in a temporary representation.
  return [(n % 128) | 128, n >> 7, ...arr]
}

// Converts a signature like 'vii' into a description of the wasm types, like
// { parameters: ['i32', 'i32'], results: [] }.
function sigToWasmTypes (sig: string): { parameters: string[]; results: string[] } {
  const typeNames: Record<string, string> = {
    i: 'i32',
    j: 'i64',
    f: 'f32',
    d: 'f64',
    e: 'externref',
    p: 'i32',
  }
// #if MEMORY64
  typeNames.p = 'i64'
// #endif
  const type = {
    parameters: [] as string[],
    results: sig[0] === 'v' ? [] : [typeNames[sig[0]]]
  }
  for (let i = 1; i < sig.length; ++i) {
    type.parameters.push(typeNames[sig[i]])
  }
  return type
}

// Note: using template literal here instead of plain object
// because jsify serializes objects w/o quotes and Closure will then
// incorrectly mangle the properties.
const wasmTypeCodes = (function () {
  const map = {
    i: 0x7f, // i32
    p: 0x7f,
    j: 0x7e, // i64
    f: 0x7d, // f32
    d: 0x7c, // f64
    e: 0x6f, // externref
  }
// #if MEMORY64
  map.p = 0x7e
// #endif
  return map
})()

function generateTypePack (types: string): number[] {
  return uleb128EncodeWithLen(Array.from(types, (type) => {
    const code = (wasmTypeCodes as any)[type]
    return code
  }))
}

function convertJsFunctionToWasm (func: Function, sig: string): Function {
  if ((WebAssembly as any).Function) {
    return new (WebAssembly as any).Function(sigToWasmTypes(sig), func)
  }

  // Rest of the module is static
  const bytes = Uint8Array.of(
    0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
    0x01, 0x00, 0x00, 0x00, // version: 1
    0x01, // Type section code
    // The module is static, with the exception of the type section, which is
    // generated based on the signature passed in.
    ...uleb128EncodeWithLen([
      0x01, // count: 1
      0x60 /* form: func */,
      // param types
      ...generateTypePack(sig.slice(1)),
      // return types (for now only supporting [] if `void` and single [T] otherwise)
      ...generateTypePack(sig[0] === 'v' ? '' : sig[0])
    ]),
    // The rest of the module is static
    0x02, 0x07, // import section
    // (import "e" "f" (func 0 (type 0)))
    0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
    0x07, 0x05, // export section
    // (export "f" (func 0 (type 0)))
    0x01, 0x01, 0x66, 0x00, 0x00
  )

  // We can compile this wasm module synchronously because it is very small.
  // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
  const module = new WebAssembly.Module(bytes)
  const instance = new WebAssembly.Instance(module, { e: { f: func } })
  const wrappedFunc = instance.exports['f'] as Function
  return wrappedFunc
}

const freeTableIndexes: number[] = []

// Weak map of functions in the table to their indexes, created on first use.
let functionsInTableMap: WeakMap<Function, number> | undefined

function getEmptyTableSlot (): number {
  // Reuse a free index if there is one, otherwise grow.
  if (freeTableIndexes.length) {
    return freeTableIndexes.pop()!
  }
  try {
    // Grow the table
    return wasmTable.grow(to64('1') as number)
  } catch (err) {
    if (!(err instanceof RangeError)) {
      throw err
    }
    throw new Error('Unable to grow wasm table. Specify `--growable-table` for wasm-ld.')
  }
}

function updateTableMap (
  offset: number,
  count: number
): void {
  if (functionsInTableMap) {
    for (let i = offset; i < offset + count; i++) {
      const item = getWasmTableEntry(i)
      // Ignore null values.
      if (item) {
        functionsInTableMap.set(item, i)
      }
    }
  }
}

function getFunctionAddress (func: Function): number {
  // First, create the map if this is the first use.
  if (!functionsInTableMap) {
    functionsInTableMap = new WeakMap()
    let count = wasmTable.length
    from64('count')
    updateTableMap(0, count)
  }
  return functionsInTableMap.get(func) || 0
}

/**
 * Add a function to the table.
 * 'sig' parameter is required if the function being added is a JS function.
 */
export function addFunction (func: Function, sig?: string): number {
  // Check if the function is already in the table, to ensure each function
  // gets a unique index.
  let rtn = getFunctionAddress(func)
  if (rtn) {
    return rtn
  }

  // It's not in the table, add it now.

  const ret = getEmptyTableSlot()

  // Set the new value.
  try {
    // Attempting to call this with JS function will cause table.set() to fail
    setWasmTableEntry(ret, func)
  } catch (err) {
    if (!(err instanceof TypeError)) {
      throw err
    }
    if (!sig) {
      throw new Error('Missing signature argument to addFunction: ' + func)
    }
    const wrapped = convertJsFunctionToWasm(func, sig)
    setWasmTableEntry(ret, wrapped)
  }

  functionsInTableMap!.set(func, ret)

  return ret
}

export function removeFunction (index: number): void {
  if (!functionsInTableMap) return
  functionsInTableMap.delete(getWasmTableEntry(index)!)
  setWasmTableEntry(index, null)
  freeTableIndexes.push(index)
}
