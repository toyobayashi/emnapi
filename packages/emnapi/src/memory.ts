declare type ViewConstuctor =
  Int8ArrayConstructor |
  Uint8ArrayConstructor |
  Uint8ClampedArrayConstructor |
  Int16ArrayConstructor |
  Uint16ArrayConstructor |
  Int32ArrayConstructor |
  Uint32ArrayConstructor |
  BigInt64ArrayConstructor |
  BigUint64ArrayConstructor |
  Float32ArrayConstructor |
  Float64ArrayConstructor |
  DataViewConstructor |
  BufferCtor

declare interface PointerInfo {
  address: void_p
  ownership: Ownership
  runtimeAllocated: 0 | 1
}

declare interface MemoryViewDescriptor extends PointerInfo {
  Ctor: ViewConstuctor
  length: number
}

declare interface ViewPointerInfo<T extends ArrayBufferView> extends PointerInfo {
  view: T
}

const emnapiExternalMemory: {
  registry: FinalizationRegistry<number> | undefined
  table: WeakMap<ArrayBuffer, PointerInfo>
  wasmMemoryViewTable: WeakMap<ArrayBufferView, MemoryViewDescriptor>
  init: () => void
  isDetachedArrayBuffer: (arrayBuffer: ArrayBufferLike) => boolean
  getOrUpdateMemoryView: <T extends ArrayBufferView>(view: T) => T
  getArrayBufferPointer: (arrayBuffer: ArrayBuffer, shouldCopy: boolean) => PointerInfo
  getViewPointer: <T extends ArrayBufferView>(view: T, shouldCopy: boolean) => ViewPointerInfo<T>
} = {
  registry: typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free($to64('_pointer') as number) }) : undefined,
  table: new WeakMap(),
  wasmMemoryViewTable: new WeakMap(),

  init: function () {
    emnapiExternalMemory.registry = typeof FinalizationRegistry === 'function' ? new FinalizationRegistry(function (_pointer) { _free($to64('_pointer') as number) }) : undefined
    emnapiExternalMemory.table = new WeakMap()
    emnapiExternalMemory.wasmMemoryViewTable = new WeakMap()
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

  getArrayBufferPointer: function (arrayBuffer: ArrayBuffer, shouldCopy: boolean): PointerInfo {
    if (arrayBuffer === wasmMemory.buffer) {
      return { address: 0, ownership: Ownership.kRuntime, runtimeAllocated: 0 }
    }

    if (emnapiExternalMemory.table.has(arrayBuffer)) {
      const info = emnapiExternalMemory.table.get(arrayBuffer)!
      if (emnapiExternalMemory.isDetachedArrayBuffer(arrayBuffer)) {
        return { address: 0, ownership: info.ownership, runtimeAllocated: info.runtimeAllocated }
      }
      if (shouldCopy && info.ownership === Ownership.kRuntime && info.runtimeAllocated === 1) {
        new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), info.address)
      }
      return info
    }

    if (emnapiExternalMemory.isDetachedArrayBuffer(arrayBuffer)) {
      return { address: 0, ownership: Ownership.kRuntime, runtimeAllocated: 0 }
    }

    if (!shouldCopy) {
      return { address: 0, ownership: Ownership.kRuntime, runtimeAllocated: 0 }
    }

    const size = arrayBuffer.byteLength
    if (size === 0) {
      return { address: 0, ownership: Ownership.kRuntime, runtimeAllocated: 0 }
    }

    const pointer = $makeMalloc('$emnapiExternalMemory.getArrayBufferPointer', 'size')
    if (!pointer) throw new Error('Out of memory')
    new Uint8Array(wasmMemory.buffer).set(new Uint8Array(arrayBuffer), pointer)
    const pointerInfo: PointerInfo = {
      address: pointer,
      ownership: emnapiExternalMemory.registry ? Ownership.kRuntime : Ownership.kUserland,
      runtimeAllocated: 1
    }
    emnapiExternalMemory.table.set(arrayBuffer, pointerInfo)
    emnapiExternalMemory.registry?.register(arrayBuffer, pointer)
    return pointerInfo
  },

  getOrUpdateMemoryView: function<T extends ArrayBufferView> (view: T): T {
    if (view.buffer === wasmMemory.buffer) {
      if (!emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        emnapiExternalMemory.wasmMemoryViewTable.set(view, {
          Ctor: view.constructor as any,
          address: view.byteOffset,
          length: view instanceof DataView ? view.byteLength : (view as any).length,
          ownership: Ownership.kUserland,
          runtimeAllocated: 0
        })
      }
      return view
    }

    if (emnapiExternalMemory.isDetachedArrayBuffer(view.buffer) && emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
      const info = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
      const Ctor = info.Ctor
      let newView: ArrayBufferView
      const Buffer = emnapiCtx.feature.Buffer
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

  getViewPointer: function<T extends ArrayBufferView> (view: T, shouldCopy: boolean): ViewPointerInfo<T> {
    view = emnapiExternalMemory.getOrUpdateMemoryView(view)
    if (view.buffer === wasmMemory.buffer) {
      if (emnapiExternalMemory.wasmMemoryViewTable.has(view)) {
        const { address, ownership, runtimeAllocated } = emnapiExternalMemory.wasmMemoryViewTable.get(view)!
        return { address, ownership, runtimeAllocated, view }
      }
      return { address: view.byteOffset, ownership: Ownership.kUserland, runtimeAllocated: 0, view }
    }

    const { address, ownership, runtimeAllocated } = emnapiExternalMemory.getArrayBufferPointer(view.buffer, shouldCopy)
    return { address: address === 0 ? 0 : (address + view.byteOffset), ownership, runtimeAllocated, view }
  }
}

emnapiDefineVar(
  '$emnapiExternalMemory',
  emnapiExternalMemory,
  ['malloc', 'free', '$emnapiInit'],
  'emnapiExternalMemory.init();'
)
