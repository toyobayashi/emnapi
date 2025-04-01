import { Disposable } from './Disaposable'
import { External, getExternalValue, isExternal } from './External'
import { BaseArrayStore, CountIdAllocator } from './Store'
import { Features } from './util'

export class Handle<S> extends Disposable {
  public id: number | bigint
  public value: S

  public constructor (value: S, id = 0) {
    super()
    this.id = id
    this.value = value
  }

  public reuse (value: S): void {
    this.value = value
  }

  public data (): void_p {
    return getExternalValue(this.value as External) as void_p
  }

  public isNumber (): boolean {
    return typeof this.value === 'number'
  }

  public isBigInt (): boolean {
    return typeof this.value === 'bigint'
  }

  public isString (): boolean {
    return typeof this.value === 'string'
  }

  public isFunction (): boolean {
    return typeof this.value === 'function'
  }

  public isExternal (): boolean {
    return isExternal(this.value)
  }

  public isObject (): boolean {
    return typeof this.value === 'object' && this.value !== null
  }

  public isArray (): boolean {
    return Array.isArray(this.value)
  }

  public isArrayBuffer (): boolean {
    return (this.value instanceof ArrayBuffer)
  }

  public isTypedArray (): boolean {
    return (ArrayBuffer.isView(this.value)) && !(this.value instanceof DataView)
  }

  public isBuffer (BufferConstructor?: BufferCtor): boolean {
    if (ArrayBuffer.isView(this.value)) return true
    return typeof BufferConstructor === 'function' && BufferConstructor.isBuffer(this.value)
  }

  public isDataView (): boolean {
    return (this.value instanceof DataView)
  }

  public isDate (): boolean {
    return (this.value instanceof Date)
  }

  public isPromise (): boolean {
    return (this.value instanceof Promise)
  }

  public isBoolean (): boolean {
    return typeof this.value === 'boolean'
  }

  public isUndefined (): boolean {
    return this.value === undefined
  }

  public isSymbol (): boolean {
    return typeof this.value === 'symbol'
  }

  public isNull (): boolean {
    return this.value === null
  }

  public dispose (): void {
    this.value = undefined!
  }
}

export class ConstHandle<S extends undefined | null | boolean | typeof globalThis> extends Handle<S> {
  public constructor (value: S, id: number) {
    super(value, id)
  }

  public override dispose (): void {}
}

export class HandleStore extends BaseArrayStore<Handle<any>> {
  public static UNDEFINED = new ConstHandle(undefined, GlobalHandle.UNDEFINED)
  public static NULL = new ConstHandle(null, GlobalHandle.NULL)
  public static FALSE = new ConstHandle(false, GlobalHandle.FALSE)
  public static TRUE = new ConstHandle(true, GlobalHandle.TRUE)

  public static MIN_ID = 6 as const

  private _allocator: CountIdAllocator

  public constructor (features: Features) {
    super(HandleStore.MIN_ID)
    this._allocator = new CountIdAllocator(HandleStore.MIN_ID)

    this._values[GlobalHandle.UNDEFINED] = HandleStore.UNDEFINED
    this._values[GlobalHandle.NULL] = HandleStore.NULL
    this._values[GlobalHandle.FALSE] = HandleStore.FALSE
    this._values[GlobalHandle.TRUE] = HandleStore.TRUE
    this._values[GlobalHandle.GLOBAL] = new ConstHandle(features.getGlobalThis(), GlobalHandle.GLOBAL)
  }

  public push<S> (value: S): Handle<S> {
    let h: Handle<S>
    const next = this._allocator.aquire()
    const values = this._values
    if (next < values.length) {
      h = values[next]!
      h.value = value
    } else {
      h = new Handle(value, next)
      values[next] = h
    }
    return h
  }

  public override dealloc (i: number | bigint): void {
    this._values[i as number]!.dispose()
  }

  public erase (start: number, end: number): void {
    this._allocator.next = start
    for (let i = start; i < end; ++i) {
      this.dealloc(i)
    }
  }

  public swap (a: number, b: number): void {
    const values = this._values
    const h = values[a]!
    values[a] = values[b]
    values[a]!.id = Number(a)
    values[b] = h
    h.id = Number(b)
  }
}
