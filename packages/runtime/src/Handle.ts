import type { Env } from './env'
import { isReferenceType, _global, _Buffer } from './util'

export class Handle<S> {
  public constructor (
    public id: number,
    public value: S
  ) {}

  public data (envObject: Env): void_p {
    return envObject.getObjectBinding(this.value as any).data
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
    return (isReferenceType(this.value) && Object.getPrototypeOf(this.value) === null)
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

  public isBuffer (): boolean {
    return typeof _Buffer === 'function' && _Buffer.isBuffer(this.value)
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
  public constructor (id: number, value: S) {
    super(id, value)
  }

  public override dispose (): void {}
}

export function External (this: any): void {
  Object.setPrototypeOf(this, null)
}
External.prototype = null as any

export class HandleStore {
  public static UNDEFINED = new ConstHandle(GlobalHandle.UNDEFINED, undefined)
  public static NULL = new ConstHandle(GlobalHandle.NULL, null)
  public static FALSE = new ConstHandle(GlobalHandle.FALSE, false)
  public static TRUE = new ConstHandle(GlobalHandle.TRUE, true)
  public static GLOBAL = new ConstHandle(GlobalHandle.GLOBAL, _global)

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

  public push<S> (value: S): Handle<S> {
    let h: Handle<S>
    const next = this._next
    const values = this._values
    if (next < values.length) {
      h = values[next]
      h.value = value
    } else {
      h = new Handle(next, value)
      values[next] = h
    }
    this._next++
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

  public dispose (): void {
    this._values.length = HandleStore.MIN_ID
    this._next = HandleStore.MIN_ID
  }
}
