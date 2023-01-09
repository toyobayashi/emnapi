import { isReferenceType, _global, Buffer } from './util'

/** @internal */
export interface IReferenceBinding {
  wrapped: number // wrapped Reference id
  tag: [number, number, number, number] | null
  data: void_p
}

/** @internal */
export class Handle<S> {
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

  public isBuffer (): boolean {
    return !this.isEmpty() && typeof Buffer === 'function' && Buffer.isBuffer(this.value)
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
    if (this.id === 0) return
    this.id = 0
    this.value = undefined!
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

  private _next: number = HandleStore.MIN_ID

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
    let h: Handle<S>
    const next = this._next
    const values = this._values
    if (next < values.length) {
      h = values[next]
      h.init(next, value)
    } else {
      h = new Handle(next, value)
      values[next] = h
    }
    this._next++
    return h
  }

  public pushExternal (data: void_p): Handle<object> {
    const value = new (External as any)()
    const h = this.push(value)
    const binding = HandleStore.initObjectBinding(value)
    binding.data = data
    return h
  }

  public erase (start: number, end: number): void {
    this._next = start
    const values = this._values
    for (let i = start; i < end; ++i) {
      values[i].dispose()
    }
  }

  public get (id: Ptr): Handle<any> | undefined {
    return this._values[id as any]
  }

  public swap (a: number, b: number): void {
    const values = this._values
    const h = values[a]
    values[a] = values[b]
    values[a]!.id = Number(a)
    values[b] = h
    h.id = Number(b)
  }
}
