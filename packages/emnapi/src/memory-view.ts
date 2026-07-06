/* eslint-disable @typescript-eslint/indent */

type MemoryDataView = InstanceType<typeof DataView>

const dataViewCache = new WeakMap<WebAssembly.Memory, MemoryDataView>()
const uint8ArrayCache = new WeakMap<WebAssembly.Memory, Uint8Array>()

function normalizeAddress (address: number): number {
// #if MEMORY64
  return address
// #else
  // eslint-disable-next-line no-unreachable
  return address >>> 0
// #endif
}

function normalizeEnd (end: number): number {
// #if MEMORY64
  return end
// #else
  // Preserve the exclusive upper bound for an access ending at the top of
  // wasm32 memory. Truncating 2^32 to zero can suppress a stale-buffer refresh.
  // eslint-disable-next-line no-unreachable
  return end < 0 ? end >>> 0 : end
// #endif
}

function ensureBufferFor (memory: WebAssembly.Memory, end: number): ArrayBufferLike {
  end = normalizeEnd(end)
  let buffer = memory.buffer
  if (
    end > buffer.byteLength &&
    Object.prototype.toString.call(buffer) === '[object SharedArrayBuffer]'
  ) {
    // Shared memory can grow on another agent while this agent still observes
    // an older, shorter buffer. Unshared memory cannot be stale this way, and
    // grow(0) would detach its current ArrayBuffer before the invalid access
    // throws.
// #if MEMORY64
    ;(memory.grow as any)(BigInt(0))
// #else
    memory.grow(0)
// #endif
    buffer = memory.buffer
  }
  return buffer
}

function getDataView (memory: WebAssembly.Memory, end: number): MemoryDataView {
  const buffer = ensureBufferFor(memory, end)
  let view = dataViewCache.get(memory)
  if (!view || view.buffer !== buffer) {
    view = new DataView(buffer)
    dataViewCache.set(memory, view)
  }
  return view
}

export const emnapiMemory = {
  ensureBufferFor (memory: WebAssembly.Memory, end: number): ArrayBufferLike {
    return ensureBufferFor(memory, end)
  },

  getDataView (memory: WebAssembly.Memory, end: number): MemoryDataView {
    return getDataView(memory, end)
  },

  getUint8Array (memory: WebAssembly.Memory, end: number): Uint8Array {
    const buffer = ensureBufferFor(memory, end)
    let view = uint8ArrayCache.get(memory)
    if (!view || view.buffer !== buffer) {
      view = new Uint8Array(buffer)
      uint8ArrayCache.set(memory, view)
    }
    return view
  },

  getPointer (memory: WebAssembly.Memory, address: number): number {
    address = normalizeAddress(address)
// #if MEMORY64
    return Number(getDataView(memory, address + 8).getBigUint64(address, true))
// #else
    // eslint-disable-next-line no-unreachable
    return getDataView(memory, address + 4).getUint32(address, true)
// #endif
  },

  getUint32 (memory: WebAssembly.Memory, address: number): number {
    address = normalizeAddress(address)
    return getDataView(memory, address + 4).getUint32(address, true)
  },

  getSizeType (memory: WebAssembly.Memory, address: number): number {
    return emnapiMemory.getPointer(memory, address)
  },

  setInt8 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 1).setInt8(address, value)
  },

  setUint8 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 1).setUint8(address, value)
  },

  setInt16 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 2).setInt16(address, value, true)
  },

  setUint16 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 2).setUint16(address, value, true)
  },

  setInt32 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 4).setInt32(address, value, true)
  },

  setUint32 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 4).setUint32(address, value, true)
  },

  setFloat64 (memory: WebAssembly.Memory, address: number, value: number): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 8).setFloat64(address, value, true)
  },

  setBigInt64 (memory: WebAssembly.Memory, address: number, value: bigint): void {
    address = normalizeAddress(address)
    getDataView(memory, address + 8).setBigInt64(address, value, true)
  },

  setPointer (memory: WebAssembly.Memory, address: number, value: number | bigint): void {
    address = normalizeAddress(address)
// #if MEMORY64
    const pointerValue = BigInt(value)
    getDataView(memory, address + 8).setBigUint64(address, pointerValue, true)
// #else
    const pointerValue32 = Number(value)
    getDataView(memory, address + 4).setUint32(address, pointerValue32, true)
// #endif
  },

  setSizeType (memory: WebAssembly.Memory, address: number, value: number): void {
    emnapiMemory.setPointer(memory, address, value)
  }
}
