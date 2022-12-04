import type { IHandleScope } from './HandleScope'
import type { Reference } from './Reference'
import { IStoreValue, Store } from './Store'
import type { Env } from './env'
import { _global, isReferenceType, supportFinalizer } from './util'

/** @internal */
export class Handle<S> implements IStoreValue {
  public static create<S> (envObject: Env, value: S): Handle<S> {
    const handle = new Handle(envObject, 0, value)
    envObject.ctx.handleStore.add(handle)
    return handle
  }

  public id: number
  protected _envObject: Env | undefined
  public value: S
  public inScope: IHandleScope | null
  public wrapped: number = 0 // wrapped Reference id
  public tag: [number, number, number, number] | null
  public refs: Reference[]

  public getEnv (): Env | undefined {
    return this._envObject
  }

  public constructor (envObject: Env | undefined, id: number, value: S) {
    this._envObject = envObject
    this.id = id
    this.value = value
    this.inScope = null
    this.wrapped = 0
    this.tag = null
    this.refs = []
  }

  public moveTo (other: Handle<S>): void {
    // other.env = this.env
    this._envObject = undefined!
    // other.id = this.id
    this.id = 0
    // other.value = this.value
    this.value = undefined!
    // other.inScope = this.inScope
    this.inScope = null
    other.wrapped = this.wrapped
    this.wrapped = 0
    other.tag = this.tag
    this.tag = null
    other.refs = this.refs
    this.refs = []
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

  public addRef (ref: Reference): void {
    if (this.refs.indexOf(ref) !== -1) {
      return
    }
    this.refs.push(ref)
  }

  public removeRef (ref: Reference): void {
    const index = this.refs.indexOf(ref)
    if (index !== -1) {
      this.refs.splice(index, 1)
    }
    this.tryDispose()
  }

  public tryDispose (): void {
    if (
      this.id < HandleStore.getMinId ||
      this.inScope !== null ||
      (supportFinalizer ? this.refs.some(ref => ref.refCount() > 0) : (this.refs.length > 0))
    ) return
    this.dispose()
  }

  public dispose (): void {
    if (this.id === 0) return
    /* if (this.refs.length > 0) {
      const refs = this.refs
      for (let i = 0; i < refs.length; i++) {
        refs[i].queueFinalizer(this.value as unknown as object)
      }
    } */
    const id = this.id
    this._envObject?.ctx.handleStore.remove(id)
    // this.refs = []
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
    const h = new ExternalHandle(envObject, data)
    envObject.ctx.handleStore.add(h)
    return h
  }

  private readonly _data: void_p

  public constructor (envObject: Env, data: void_p = 0) {
    super(envObject, 0, new (External as any)())
    this._data = data
  }

  public data (): void_p {
    return this._data
  }
}

/** @internal */
export class HandleStore extends Store<Handle<any>> {
  public static ID_UNDEFINED: 1 = 1
  public static ID_NULL: 2 = 2
  public static ID_FALSE: 3 = 3
  public static ID_TRUE: 4 = 4
  public static ID_GLOBAL: 5 = 5

  public static get getMinId (): number {
    return 6
  }

  public static globalConstants = {
    [HandleStore.ID_UNDEFINED]: undefined,
    [HandleStore.ID_NULL]: null,
    [HandleStore.ID_FALSE]: false,
    [HandleStore.ID_TRUE]: true,
    [HandleStore.ID_GLOBAL]: _global
  }

  // js object -> Handle
  private _objWeakMap: WeakMap<object, Handle<object>>

  public constructor () {
    super(16)
    this._objWeakMap = new WeakMap()
    super.add(new Handle(undefined, 1, undefined))
    super.add(new Handle(undefined, 2, null))
    super.add(new Handle(undefined, 3, false))
    super.add(new Handle(undefined, 4, true))
    super.add(new Handle(undefined, 5, _global))
  }

  public override add (h: Handle<any>): void {
    super.add(h)
    const isRefType = isReferenceType(h.value)
    if (isRefType) {
      if (this._objWeakMap.has(h.value)) {
        const old = this._objWeakMap.get(h.value)!
        old.moveTo(h)
      }
      this._objWeakMap.set(h.value, h)
    }
  }

  public override remove (id: number): void {
    if (!this.has(id) || id < HandleStore.getMinId) return
    super.remove(id)
  }

  public getObjectHandle<T extends object> (value: T): Handle<T> | undefined {
    return this._objWeakMap.get(value) as Handle<T>
  }

  public dispose (): void {
    this._objWeakMap = null!
    super.dispose()
  }
}
