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
  intrinsics: {
    isView: (value: any) => value is ArrayBufferView
    typedArray: {
      buffer: (this: any) => ArrayBufferLike
      byteOffset: (this: any) => number
      length: (this: any) => number
      tag: (this: any) => string | undefined
    }
    dataView: {
      buffer: (this: any) => ArrayBufferLike
      byteOffset: (this: any) => number
      byteLength: (this: any) => number
    }
    arrayBuffer: {
      byteLength: (this: any) => number
    }
    sharedArrayBuffer: {
      byteLength: (this: any) => number
    } | undefined
    ctors: { [name: string]: ViewConstuctor | undefined }
    // captured once from the runtime Buffer at the first Buffer-descriptor
    // creation (see getBufferFrom): reconstruction must not read a
    // user-replaceable live Buffer.from
    bufferFrom: ((buffer: ArrayBufferLike, byteOffset?: number, length?: number) => ArrayBufferView) | undefined
  }
  init: () => void
  isSharedArrayBuffer: (value: any) => value is SharedArrayBuffer
  isDetachedArrayBuffer: (arrayBuffer: ArrayBufferLike) => boolean
  bufferByteLength: (buffer: ArrayBufferLike) => number
  viewBuffer: (view: ArrayBufferView) => ArrayBufferLike
  viewByteOffset: (view: ArrayBufferView) => number
  viewLength: (view: ArrayBufferView) => number
  getBufferFrom: () => (buffer: ArrayBufferLike, byteOffset?: number, length?: number) => ArrayBufferView
  getOrUpdateMemoryView: <T extends ArrayBufferView>(view: T) => T
  getArrayBufferPointer: (arrayBuffer: ArrayBufferLike, shouldCopy: boolean) => ArrayBufferPointer
  getViewPointer: <T extends ArrayBufferView>(view: T, shouldCopy: boolean) => ViewPointer<T>
} = {
  registry: typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(to64('_pointer') as number) }) : undefined,
  table: new WeakMap(),
  wasmMemoryViewTable: new WeakMap(),

  // populated by init(): live intrinsic function references must not exist at
  // library definition time — the emscripten jsifier re-serializes this object
  // and native functions do not stringify to parseable source
  intrinsics: undefined!,

  init: function () {
    emnapiExternalMemory.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free(to64('_pointer') as number) }) : undefined
    emnapiExternalMemory.table = new WeakMap()
    emnapiExternalMemory.wasmMemoryViewTable = new WeakMap()

    const sharedArrayBufferByteLength = typeof SharedArrayBuffer === 'function'
      ? Object.getOwnPropertyDescriptor(SharedArrayBuffer.prototype, 'byteLength')?.get
      : undefined

    // cached intrinsic prototype getters and element-type constructors: they
    // read the internal slots directly like native Node-API does, so user
    // accessors and user subclass constructors can never run inside get-info
    // metadata reads, descriptor registration or view reconstruction, and they
    // work for instances from any realm
    emnapiExternalMemory.intrinsics = {
      // ArrayBuffer.isView ignores its `this`, so a bare cached reference is
      // safe and cannot be swapped out by user code replacing the global
      isView: ArrayBuffer.isView,
      typedArray: {
        buffer: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'buffer')!.get!,
        byteOffset: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'byteOffset')!.get!,
        length: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), 'length')!.get!,
        tag: Object.getOwnPropertyDescriptor(Object.getPrototypeOf(Uint8Array.prototype), Symbol.toStringTag)!.get!
      },
      dataView: {
        buffer: Object.getOwnPropertyDescriptor(DataView.prototype, 'buffer')!.get!,
        byteOffset: Object.getOwnPropertyDescriptor(DataView.prototype, 'byteOffset')!.get!,
        byteLength: Object.getOwnPropertyDescriptor(DataView.prototype, 'byteLength')!.get!
      },
      arrayBuffer: {
        byteLength: Object.getOwnPropertyDescriptor(ArrayBuffer.prototype, 'byteLength')!.get!
      },
      // a SharedArrayBuffer polyfill may lack the byteLength accessor: degrade
      // to the hidden-global classification path instead of throwing here
      sharedArrayBuffer: sharedArrayBufferByteLength !== undefined
        ? {
            byteLength: sharedArrayBufferByteLength
          }
        : undefined,
      ctors: {
        Int8Array,
        Uint8Array,
        Uint8ClampedArray,
        Int16Array,
        Uint16Array,
        Int32Array,
        Uint32Array,
        Float16Array: typeof Float16Array === 'function' ? Float16Array : undefined,
        Float32Array,
        Float64Array,
        BigInt64Array,
        BigUint64Array
      },
      bufferFrom: undefined
    }
  },

  isSharedArrayBuffer (value: any): value is SharedArrayBuffer {
    const sharedArrayBuffer = emnapiExternalMemory.intrinsics.sharedArrayBuffer
    if (sharedArrayBuffer !== undefined) {
      if (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer) return true
      // the intrinsic byteLength getter reads the internal slot: it accepts
      // SharedArrayBuffer instances from any realm and throws for anything
      // else, without consulting user-controllable properties
      try {
        sharedArrayBuffer.byteLength.call(value)
        return true
      } catch (_) {
        return false
      }
    }
    // hidden-global environment (see #143): the SharedArrayBuffer global was
    // absent at init time, but the engine can still hand out genuine SABs
    // (e.g. a shared WebAssembly.Memory buffer). A genuine ArrayBuffer
    // answers the intrinsic byteLength probe, settling the common case
    // without the (spoofable, user-JS-running) toString tag read below.
    try {
      emnapiExternalMemory.intrinsics.arrayBuffer.byteLength.call(value)
      return false
    } catch (_) {}
    return Object.prototype.toString.call(value) === '[object SharedArrayBuffer]'
  },

  isDetachedArrayBuffer: function (arrayBuffer: ArrayBufferLike): boolean {
    if (emnapiExternalMemory.bufferByteLength(arrayBuffer) === 0) {
      try {
        // eslint-disable-next-line no-new
        new Uint8Array(arrayBuffer)
      } catch (_) {
        return true
      }
    }
    return false
  },

  bufferByteLength: function (buffer: ArrayBufferLike): number {
    const intrinsics = emnapiExternalMemory.intrinsics
    try {
      return intrinsics.arrayBuffer.byteLength.call(buffer)
    } catch (err) {
      const sharedArrayBuffer = intrinsics.sharedArrayBuffer
      if (sharedArrayBuffer !== undefined) {
        return sharedArrayBuffer.byteLength.call(buffer)
      }
      // hidden-global environment (see isSharedArrayBuffer): no SAB getter
      // was capturable at init, recover it from the instance's own prototype
      // (for a genuine SAB that is the hidden SharedArrayBuffer.prototype)
      const proto = Object.getPrototypeOf(buffer)
      const get = proto !== null && proto !== undefined
        ? Object.getOwnPropertyDescriptor(proto, 'byteLength')?.get
        : undefined
      if (get === undefined) throw err
      return get.call(buffer)
    }
  },

  viewBuffer: function (view: ArrayBufferView): ArrayBufferLike {
    const intrinsics = emnapiExternalMemory.intrinsics
    return intrinsics.typedArray.tag.call(view) === undefined
      ? intrinsics.dataView.buffer.call(view)
      : intrinsics.typedArray.buffer.call(view)
  },

  viewByteOffset: function (view: ArrayBufferView): number {
    const intrinsics = emnapiExternalMemory.intrinsics
    return intrinsics.typedArray.tag.call(view) === undefined
      ? intrinsics.dataView.byteOffset.call(view)
      : intrinsics.typedArray.byteOffset.call(view)
  },

  // element count for typed arrays, byteLength for DataViews (the unit used
  // by the napi_get_typedarray_info / napi_get_dataview_info length outputs
  // and by the view constructors at reconstruction)
  viewLength: function (view: ArrayBufferView): number {
    const intrinsics = emnapiExternalMemory.intrinsics
    return intrinsics.typedArray.tag.call(view) === undefined
      ? intrinsics.dataView.byteLength.call(view)
      : intrinsics.typedArray.length.call(view)
  },

  // Buffer descriptors are only ever created by emnapi's own buffer creation
  // paths; capturing Buffer.from the first time one is created snapshots the
  // legitimate function before any later reconstruction, so a user replacing
  // Buffer.from afterwards cannot influence a refreshed view
  getBufferFrom: function () {
    return emnapiExternalMemory.intrinsics.bufferFrom ??
      (emnapiExternalMemory.intrinsics.bufferFrom = emnapiCtx.features.Buffer!.from as any)
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

    const byteLength = emnapiExternalMemory.bufferByteLength(arrayBuffer)
    if (isDetached || (byteLength === 0)) {
      return info
    }

    if (!shouldCopy) {
      return info
    }

    let pointer = _malloc(to64('byteLength'))
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
    // classify and read the view state through the cached intrinsic
    // prototype getters only: own accessors on the instance could otherwise
    // run user JS that grows (and detaches) a non-shared memory in the
    // middle of registration, poisoning the stored descriptor; the intrinsic
    // reads return primitives from the internal slots and run zero user JS.
    // The @@toStringTag slot getter classifies views from any realm: it
    // returns the element-type name for typed arrays (seeing through user
    // subclasses) and undefined for DataViews
    const intrinsics = emnapiExternalMemory.intrinsics
    const tag = intrinsics.typedArray.tag.call(view)
    const isDataView = tag === undefined
    const buffer: ArrayBufferLike = isDataView ? intrinsics.dataView.buffer.call(view) : intrinsics.typedArray.buffer.call(view)
    if (buffer === wasmMemory.buffer) {
      if (!emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        emnapiExternalMemory.wasmMemoryViewTable.set(view, {
          // store the intrinsic element-type constructor keyed by the
          // @@toStringTag slot (never view.constructor and never a
          // user-definable Buffer @@hasInstance check): reconstruction after a
          // memory growth must not run any user code, because it could grow
          // again after the fresh buffer was captured as an argument. Buffers
          // are tagged 'Uint8Array' and reconstruct as base Uint8Array views
          Ctor: isDataView ? DataView : intrinsics.ctors[tag]!,
          address: isDataView ? intrinsics.dataView.byteOffset.call(view) : intrinsics.typedArray.byteOffset.call(view),
          length: isDataView ? intrinsics.dataView.byteLength.call(view) : intrinsics.typedArray.length.call(view),
          ownership: ReferenceOwnership.kUserland,
          runtimeAllocated: 0
        })
      }
      return view
    }

    const maybeOldWasmMemory = emnapiExternalMemory.isDetachedArrayBuffer(buffer) || emnapiExternalMemory.isSharedArrayBuffer(buffer)
    if (maybeOldWasmMemory && emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
      const info = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
      const Ctor = info.Ctor
      let newView: ArrayBufferView
      const Buffer = emnapiCtx.features.Buffer
      if (typeof Buffer === 'function' && Ctor === Buffer) {
        // reconstruct through the Buffer.from captured at creation time
        newView = emnapiExternalMemory.getBufferFrom()(wasmMemory.buffer, info.address, info.length)
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
    const buffer = emnapiExternalMemory.viewBuffer(view)
    if (buffer === wasmMemory.buffer) {
      if (emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        const { address, ownership, runtimeAllocated } = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
        return { address, ownership, runtimeAllocated, view }
      }
      return { address: emnapiExternalMemory.viewByteOffset(view), ownership: ReferenceOwnership.kUserland, runtimeAllocated: 0, view }
    }

    const { address, ownership, runtimeAllocated } = emnapiExternalMemory.getArrayBufferPointer(buffer, shouldCopy)
    return { address: address === 0 ? 0 : (address + emnapiExternalMemory.viewByteOffset(view)), ownership, runtimeAllocated, view }
  }
}

export interface ExternalSABInfo {
  external_data: number
  byte_length: number
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
    const external_data = makeGetValue('metaPtr', POINTER_SIZE, '*')
    const byte_length = makeGetValue('metaPtr', POINTER_SIZE * 2, '*')
    const finalize_cb = makeGetValue('metaPtr', POINTER_SIZE * 3, '*')
    const finalize_data = makeGetValue('metaPtr', POINTER_SIZE * 4, '*')
    const finalize_hint = makeGetValue('metaPtr', POINTER_SIZE * 5, '*')
    return { external_data, byte_length, finalize_cb, finalize_data, finalize_hint }
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
