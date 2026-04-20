import { _free, wasmMemory, _malloc } from 'emscripten:runtime'
import { emnapiCtx } from 'emnapi:shared'
import { from64, to64, makeDynCall, POINTER_SIZE, makeSetValue, makeGetValue } from 'emscripten:parse-tools'

export type ViewConstuctor = new (...args: any[]) => ArrayBufferView

export interface ArrayBufferPointer {
  address: number
  ownership: ReferenceOwnership
  runtimeAllocated: 0 | 1
}

export interface MemoryViewDescriptor extends ArrayBufferPointer {
  Ctor: ViewConstuctor
  length: number
}

export interface ViewPointer<T extends ArrayBufferView> extends ArrayBufferPointer {
  view: T
}

/**
 * @__deps malloc
 * @__deps free
 * @__postset
 * ```
 * emnapiExternalMemory.init();
 * ```
 */
export const emnapiExternalMemory: {
  registry: FinalizationRegistry<number> | undefined
  table: WeakMap<ArrayBufferLike, ArrayBufferPointer>
  wasmMemoryViewTable: WeakMap<ArrayBufferView, MemoryViewDescriptor>
  init: () => void
  isSharedArrayBuffer: (value: any) => value is SharedArrayBuffer
  isDetachedArrayBuffer: (arrayBuffer: ArrayBufferLike) => boolean
  getOrUpdateMemoryView: <T extends ArrayBufferView>(view: T) => T
  getArrayBufferPointer: (arrayBuffer: ArrayBufferLike, shouldCopy: boolean) => ArrayBufferPointer
  getViewPointer: <T extends ArrayBufferView>(view: T, shouldCopy: boolean) => ViewPointer<T>
} = {
  registry: typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(to64('_pointer') as number) }) : undefined,
  table: new WeakMap(),
  wasmMemoryViewTable: new WeakMap(),

  init: function () {
    emnapiExternalMemory.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(to64('_pointer') as number) }) : undefined
    emnapiExternalMemory.table = new WeakMap()
    emnapiExternalMemory.wasmMemoryViewTable = new WeakMap()
  },

  isSharedArrayBuffer (value: any): value is SharedArrayBuffer {
    return (
      (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) ||
      (Object.prototype.toString.call(value) === '[object SharedArrayBuffer]')
    )
  },

  isDetachedArrayBuffer: function (arrayBuffer: ArrayBufferLike): boolean {
    if (arrayBuffer.byteLength === 0) {
      try {
        // eslint-disable-next-line no-new
        new Uint8Array(arrayBuffer)
      } catch (_) {
        return true
      }
    }
    return false
  },

  getArrayBufferPointer: function (arrayBuffer: ArrayBufferLike, shouldCopy: boolean): ArrayBufferPointer {
    const info: ArrayBufferPointer = {
      address: 0,
      ownership: ReferenceOwnership.kRuntime,
      runtimeAllocated: 0
    }
    if (arrayBuffer === wasmMemory.buffer) {
      return info
    }

    const isDetached = emnapiExternalMemory.isDetachedArrayBuffer(arrayBuffer)
    if (emnapiExternalMemory.table.has(arrayBuffer)) {
      const cachedInfo = emnapiExternalMemory.table.get(arrayBuffer)!
      if (isDetached) {
        cachedInfo.address = 0
        return cachedInfo
      }
      if (shouldCopy && cachedInfo.ownership === ReferenceOwnership.kRuntime && cachedInfo.runtimeAllocated === 1) {
        new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), cachedInfo.address)
      }
      return cachedInfo
    }

    if (isDetached || (arrayBuffer.byteLength === 0)) {
      return info
    }

    if (!shouldCopy) {
      return info
    }

    let pointer = _malloc(to64('arrayBuffer.byteLength'))
    if (!pointer) throw new Error('Out of memory')
    from64('pointer')
    new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), pointer as number)

    info.address = pointer as number
    info.ownership = emnapiExternalMemory.registry ? ReferenceOwnership.kRuntime : ReferenceOwnership.kUserland
    info.runtimeAllocated = 1

    emnapiExternalMemory.table.set(arrayBuffer, info)
    emnapiExternalMemory.registry?.register(arrayBuffer, pointer as number)
    return info
  },

  getOrUpdateMemoryView: function<T extends ArrayBufferView> (view: T): T {
    if (view.buffer === wasmMemory.buffer) {
      if (!emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        emnapiExternalMemory.wasmMemoryViewTable.set(view, {
          Ctor: view.constructor as any,
          address: view.byteOffset,
          length: view instanceof DataView ? view.byteLength : (view as any).length,
          ownership: ReferenceOwnership.kUserland,
          runtimeAllocated: 0
        })
      }
      return view
    }

    const maybeOldWasmMemory = emnapiExternalMemory.isDetachedArrayBuffer(view.buffer) || emnapiExternalMemory.isSharedArrayBuffer(view.buffer)
    if (maybeOldWasmMemory && emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
      const info = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
      const Ctor = info.Ctor
      let newView: ArrayBufferView
      const Buffer = emnapiCtx.features.Buffer
      if (typeof Buffer === 'function' && Ctor === Buffer) {
        newView = Buffer.from(wasmMemory.buffer, info.address, info.length)
      } else {
        newView = new Ctor(wasmMemory.buffer, info.address, info.length)
      }
      emnapiExternalMemory.wasmMemoryViewTable.set(newView, info)
      return newView as unknown as T
    }

    return view
  },

  getViewPointer: function<T extends ArrayBufferView> (view: T, shouldCopy: boolean): ViewPointer<T> {
    view = emnapiExternalMemory.getOrUpdateMemoryView(view)
    if (view.buffer === wasmMemory.buffer) {
      if (emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        const { address, ownership, runtimeAllocated } = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
        return { address, ownership, runtimeAllocated, view }
      }
      return { address: view.byteOffset, ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0, view }
    }

    const { address, ownership, runtimeAllocated } = emnapiExternalMemory.getArrayBufferPointer(view.buffer, shouldCopy)
    return { address: address === 0 ? 0 : (address + view.byteOffset), ownership, runtimeAllocated, view }
  }
}

export interface ExternalSABInfo {
  finalize_cb: number
  finalize_data: number
  finalize_hint: number
}

/**
 * Metadata layout in wasm shared memory (allocated with _malloc):
 *   offset 0:              refcount     (int32, 4 bytes - for Atomics)
 *   offset POINTER_SIZE:   external_data (pointer)
 *   offset 2*POINTER_SIZE: byte_length   (size_t)
 *   offset 3*POINTER_SIZE: finalize_cb   (pointer)
 *   offset 4*POINTER_SIZE: finalize_data (pointer)
 *   offset 5*POINTER_SIZE: finalize_hint (pointer)
 *   Total: 6 * POINTER_SIZE bytes
 */

/**
 * @__postset
 * ```
 * emnapiExternalSAB.init();
 * ```
 */
export const emnapiExternalSAB: {
  registry: FinalizationRegistry<number> | undefined
  handleTable: WeakMap<SharedArrayBuffer, number>
  init: () => void
  allocMeta: (external_data: number, byte_length: number, finalize_cb: number, finalize_data: number, finalize_hint: number) => number
  readMeta: (metaPtr: number) => ExternalSABInfo
  release: (metaPtr: number) => void
} = {
  registry: undefined,
  handleTable: new WeakMap(),

  init: function () {
    emnapiExternalSAB.handleTable = new WeakMap()
    emnapiExternalSAB.registry = typeof FinalizationRegistry === 'function'
      ? new FinalizationRegistry(function (metaPtr: number) {
        emnapiExternalSAB.release(metaPtr)
      })
      : undefined
  },

  allocMeta: function (external_data: number, byte_length: number, finalize_cb: number, finalize_data: number, finalize_hint: number): number {
    const size: number = POINTER_SIZE * 6
    let metaPtr = _malloc(to64('size'))
    if (!metaPtr) throw new Error('Out of memory')
    from64('metaPtr')
    // refcount = 1
    Atomics.store(new Int32Array(wasmMemory.buffer, metaPtr as number, 1), 0, 1)
    makeSetValue('metaPtr', POINTER_SIZE, 'external_data', '*')
    makeSetValue('metaPtr', POINTER_SIZE * 2, 'byte_length', '*')
    makeSetValue('metaPtr', POINTER_SIZE * 3, 'finalize_cb', '*')
    makeSetValue('metaPtr', POINTER_SIZE * 4, 'finalize_data', '*')
    makeSetValue('metaPtr', POINTER_SIZE * 5, 'finalize_hint', '*')
    return metaPtr as number
  },

  readMeta: function (metaPtr: number): ExternalSABInfo {
    const finalize_cb = makeGetValue('metaPtr', POINTER_SIZE * 3, '*')
    const finalize_data = makeGetValue('metaPtr', POINTER_SIZE * 4, '*')
    const finalize_hint = makeGetValue('metaPtr', POINTER_SIZE * 5, '*')
    return { finalize_cb, finalize_data, finalize_hint }
  },

  release: function (metaPtr: number): void {
    const oldRefcount = Atomics.sub(new Int32Array(wasmMemory.buffer, metaPtr, 1), 0, 1)
    if (oldRefcount === 1) {
      // refcount reached 0, we are the last holder
      const info = emnapiExternalSAB.readMeta(metaPtr)
      const finalize_cb = info.finalize_cb
      if (finalize_cb) {
        const finalize_data = info.finalize_data
        const finalize_hint = info.finalize_hint
        makeDynCall('vpp', 'finalize_cb')(finalize_data, finalize_hint)
      }
      _free(to64('metaPtr') as number)
    }
  }
}
