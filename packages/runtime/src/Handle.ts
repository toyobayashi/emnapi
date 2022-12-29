import type { IStoreValue } from './Store'
import type { Env } from './env'
import { _global } from './util'

/** @internal */
export class Handle<S> implements IStoreValue {
  public static create<S> (envObject: Env, value: S, isRefType: boolean): Handle<S> {
    return envObject.ctx.handleStore.push(value, isRefType)
  }

  public id: number
  public value: S
  public wrapped: number = 0 // wrapped Reference id
  public tag: [number, number, number, number] | null

  public constructor (id: number, value: S) {
    this.id = id
    this.value = value
    this.wrapped = 0
    this.tag = null
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
    return !this.isEmpty() && (this instanceof ExternalHandle)
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
    if (this.id < HandleStore.MIN_ID) return
    this.id = 0
    this.value = undefined!
  }
}

function External (this: any): void {
  Object.setPrototypeOf(this, null)
}
External.prototype = null as any

export class ExternalHandle extends Handle<{}> {
  public static createExternal (envObject: Env, data: void_p = 0): ExternalHandle {
    return envObject.ctx.handleStore.pushExternal(data)
  }

  private readonly _data: void_p

  public constructor (id: number, data: void_p = 0) {
    super(id, new (External as any)())
    this._data = data
  }

  public data (): void_p {
    return this._data
  }
}

/** @internal */
export class HandleStore {
  public static ID_UNDEFINED: 1 = 1
  public static ID_NULL: 2 = 2
  public static ID_FALSE: 3 = 3
  public static ID_TRUE: 4 = 4
  public static ID_GLOBAL: 5 = 5

  public static MIN_ID: 6 = 6

  public static globalConstants = {
    [HandleStore.ID_UNDEFINED]: undefined,
    [HandleStore.ID_NULL]: null,
    [HandleStore.ID_FALSE]: false,
    [HandleStore.ID_TRUE]: true,
    [HandleStore.ID_GLOBAL]: _global
  }

  private readonly _values: Array<Handle<any>> = [
    undefined!,
    new Handle(1, undefined),
    new Handle(2, null),
    new Handle(3, false),
    new Handle(4, true),
    new Handle(5, _global)
  ]

  // js object -> Handle
  private static readonly _objWeakMap: WeakMap<object, Handle<object>> = new WeakMap()

  public static getObjectHandle<S extends object> (value: S): Handle<S> | undefined {
    return HandleStore._objWeakMap.get(value) as Handle<S>
  }

  public push<S> (value: S, isRefType: boolean): Handle<S> {
    const h = new Handle(this._values.length, value)
    this._values.push(h)
    if (isRefType) {
      HandleStore._objWeakMap.set(value as any, h as any)
    }
    return h
  }

  public pushHandle (handle: Handle<any>): void {
    handle.id = this._values.length
    this._values.push(handle)
  }

  public pushExternal (data: void_p): ExternalHandle {
    const h = new ExternalHandle(this._values.length, data)
    this._values.push(h)
    HandleStore._objWeakMap.set(h.value, h)
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
