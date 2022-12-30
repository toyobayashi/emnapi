import type { IReusableStoreValue } from './Store'
import type { Env } from './env'
import { isReferenceType, _global } from './util'

/** @internal */
export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: [number, number, number, number] | null
  data: void_p
}

/** @internal */
export class Handle<S> implements IReusableStoreValue {
  public static create<S> (envObject: Env, value: S): Handle<S> {
    return envObject.ctx.handleStore.push(value)
  }

  public constructor (
    public id: number,
    public value: S
  ) {}

  public init (id: number, value: S): void {
    this.id = id
    this.value = value
  }

  public data (): void_p {
    return HandleStore.getObjectBinding(this.value as any).data
  }

  public isEmpty (): boolean {
    return this.id === 0
  }

  public isNumber (): boolean {
    return !this.isEmpty() && typeof this.value === 'number'
  }

  public isBigInt (): boolean {
    return !this.isEmpty() && typeof this.value === 'bigint'
  }

  public isString (): boolean {
    return !this.isEmpty() && typeof this.value === 'string'
  }

  public isFunction (): boolean {
    return !this.isEmpty() && typeof this.value === 'function'
  }

  public isExternal (): boolean {
    return !this.isEmpty() && (isReferenceType(this.value) && Object.getPrototypeOf(this.value) === null)
  }

  public isObject (): boolean {
    return !this.isEmpty() && typeof this.value === 'object' && this.value !== null
  }

  public isArray (): boolean {
    return !this.isEmpty() && Array.isArray(this.value)
  }

  public isArrayBuffer (): boolean {
    return !this.isEmpty() && (this.value instanceof ArrayBuffer)
  }

  public isTypedArray (): boolean {
    return !this.isEmpty() && (ArrayBuffer.isView(this.value)) && !(this.value instanceof DataView)
  }

  public isDataView (): boolean {
    return !this.isEmpty() && (this.value instanceof DataView)
  }

  public isDate (): boolean {
    return !this.isEmpty() && (this.value instanceof Date)
  }

  public isPromise (): boolean {
    return !this.isEmpty() && (this.value instanceof Promise)
  }

  public isBoolean (): boolean {
    return !this.isEmpty() && typeof this.value === 'boolean'
  }

  public isUndefined (): boolean {
    return !this.isEmpty() && this.value === undefined
  }

  public isSymbol (): boolean {
    return !this.isEmpty() && typeof this.value === 'symbol'
  }

  public isNull (): boolean {
    return !this.isEmpty() && this.value === null
  }

  public dispose (): void {
    this.init(0, undefined!)
  }
}

/** @internal */
export class ConstHandle<S extends undefined | null | boolean | typeof globalThis> extends Handle<S> {
  public constructor (id: number, value: S) {
    super(id, value)
  }

  public override dispose (): void {}
}

function External (this: any): void {
  Object.setPrototypeOf(this, null)
}
External.prototype = null as any

/** @internal */
export class HandleStore {
  public static UNDEFINED = new ConstHandle(1, undefined)
  public static NULL = new ConstHandle(2, null)
  public static FALSE = new ConstHandle(3, false)
  public static TRUE = new ConstHandle(4, true)
  public static GLOBAL = new ConstHandle(5, _global)

  public static ID_UNDEFINED = HandleStore.UNDEFINED.id as 1
  public static ID_NULL = HandleStore.NULL.id as 2
  public static ID_FALSE = HandleStore.FALSE.id as 3
  public static ID_TRUE = HandleStore.TRUE.id as 4
  public static ID_GLOBAL = HandleStore.GLOBAL.id as 5

  public static MIN_ID = 6 as const

  private readonly _values: Array<Handle<any>> = [
    undefined!,
    HandleStore.UNDEFINED,
    HandleStore.NULL,
    HandleStore.FALSE,
    HandleStore.TRUE,
    HandleStore.GLOBAL
  ]

  // js object -> IReferenceBinding
  private static readonly _objWeakMap: WeakMap<object, IReferenceBinding> = new WeakMap()

  public static initObjectBinding<S extends object> (value: S): IReferenceBinding {
    const binding: IReferenceBinding = {
      wrapped: 0,
      tag: null,
      data: 0
    }
    HandleStore._objWeakMap.set(value, binding)
    return binding
  }

  public static getObjectBinding<S extends object> (value: S): IReferenceBinding {
    if (HandleStore._objWeakMap.has(value)) {
      return HandleStore._objWeakMap.get(value)!
    }
    return HandleStore.initObjectBinding(value)
  }

  public push<S> (value: S): Handle<S> {
    const h = new Handle(this._values.length, value)
    this._values.push(h)
    return h
  }

  public pushHandle (handle: Handle<any>): void {
    handle.id = this._values.length
    this._values.push(handle)
  }

  public pushExternal (data: void_p): Handle<object> {
    const value = new (External as any)()
    const h = new Handle(this._values.length, value)
    const binding = HandleStore.initObjectBinding(value)
    binding.data = data
    this._values.push(h)
    return h
  }

  public pop (n = 1): void {
    let i = 0
    while (this._values.length > HandleStore.MIN_ID && i < n) {
      const h = this._values.pop()!
      h.dispose()
      i++
    }
  }

  public get (id: Ptr): Handle<any> | undefined {
    return this._values[id as any]
  }

  public swap (a: number, b: number): void {
    const h = this._values[a]
    this._values[a] = this._values[b]
    this._values[a]!.id = Number(a)
    this._values[b] = h
    h.id = Number(b)
  }
}
