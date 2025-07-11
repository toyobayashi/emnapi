import type { Env } from './env'
import { Persistent } from './Persistent'
import { RefTracker } from './RefTracker'
import { Finalizer } from './Finalizer'
import type { Context } from './Context'

export enum ReferenceOwnership {
  kRuntime,
  kUserland
}

function canBeHeldWeakly (value: any): boolean {
  if (!value) return false
  const type = typeof value
  return type === 'object' || type === 'function' || type === 'symbol'
}

export class Reference extends RefTracker {
  private static weakCallback (ref: Reference): void {
    ref.persistent.reset()
    ref.invokeFinalizerFromGC()
  }

  public id: number
  public envObject: Env | undefined
  private ctx: Context

  private canBeWeak!: boolean
  private _refcount: number
  private _ownership: ReferenceOwnership
  public persistent!: Persistent<object>

  public static create (
    ctx: Context,
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    _unused1?: void_p,
    _unused2?: void_p,
    _unused3?: void_p
  ): Reference
  public static create (
    ctx: Context,
    envObject: undefined,
    handle_id: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    _unused1?: void_p,
    _unused2?: void_p,
    _unused3?: void_p
  ): Reference

  public static create (
    ctx: Context,
    envObject: any,
    handle_id: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    _unused1?: void_p,
    _unused2?: void_p,
    _unused3?: void_p
  ): Reference {
    const ref = new Reference(
      ctx, envObject, handle_id, initialRefcount, ownership
    )
    if (envObject) {
      ref.link(envObject.reflist)
    }
    return ref
  }

  public constructor (
    ctx: Context,
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  )
  public constructor (
    ctx: Context,
    envObject: undefined,
    handle_id: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  )

  public constructor (
    ctx: Context,
    envObject: Env | undefined,
    handle_id: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ) {
    super()
    this.envObject = envObject
    this._refcount = initialRefcount
    this._ownership = ownership
    const value = envObject ? envObject.ctx.jsValueFromNapiValue(handle_id)! : handle_id
    this.canBeWeak = canBeHeldWeakly(value)
    this.persistent = new Persistent(value)
    this.ctx = ctx
    this.id = ctx.getCurrentScope().add(this)
    if (initialRefcount === 0) {
      this._setWeak()
    }
  }

  protected _assign (target: Reference): void {
    target.envObject = this.envObject
    target.ctx = this.ctx
    target._refcount = this._refcount
    target._ownership = this._ownership
    target.canBeWeak = this.canBeWeak
    if (this.persistent.isEmpty()) {
      target.persistent = new Persistent()
    } else {
      target.persistent = new Persistent(this.persistent.deref()!)
    }
    if (target._refcount === 0) {
      target._setWeak()
    }
  }

  protected _move (target: Reference): void {
    this._assign(target)
    target.id = this.id
    this._refcount = 0
    this.persistent.reset()
  }

  protected _copy<C extends new (...args: any[]) => Reference> (Ctor: C): InstanceType<C> {
    if (this.id === 0) {
      throw new Error('Cannot copy a disposed Reference')
    }
    const newRef: InstanceType<C> = Object.create(Ctor.prototype)
    newRef._prev = newRef._next = null
    this._assign(newRef)
    newRef.id = this.ctx.getCurrentScope().add(newRef)
    if (this.envObject) {
      newRef.link(this.envObject!.reflist)
    }
    return newRef
  }

  public copy (): Reference {
    return this._copy(Reference)
  }

  public move (target: Reference): void {
    this._move(target)
  }

  public ref (): number {
    if (this.persistent.isEmpty()) {
      return 0
    }

    if (++this._refcount === 1 && this.canBeWeak) {
      this.persistent.clearWeak()
    }

    return this._refcount
  }

  public unref (): number {
    if (this.persistent.isEmpty() || this._refcount === 0) {
      return 0
    }

    if (--this._refcount === 0) {
      this._setWeak()
    }
    return this._refcount
  }

  public deref (): any {
    return this.persistent.deref()
  }

  public get (ctx: Context): napi_value {
    if (this.persistent.isEmpty()) {
      return 0
    }
    const obj = this.persistent.deref()
    return ctx.napiValueFromJsValue(obj)
  }

  /** @virtual */
  public resetFinalizer (): void {}

  /** @virtual */
  public data (): void_p { return 0 }

  public refcount (): number { return this._refcount }

  public ownership (): ReferenceOwnership { return this._ownership }

  /** @virtual */
  protected callUserFinalizer (): void {}

  /** @virtual */
  protected invokeFinalizerFromGC (): void {
    this.finalize()
  }

  private _setWeak (): void {
    this.setWeakWithData(this, Reference.weakCallback)
  }

  public setWeakWithData<T> (data: T, callback: (data: T) => void): void {
    if (this.canBeWeak) {
      this.persistent.setWeak(data, callback)
    } else {
      this.persistent.reset()
    }
  }

  public clearWeak (): void {
    this.persistent.clearWeak()
  }

  public override finalize (): void {
    this.persistent.reset()
    const deleteMe = this._ownership === ReferenceOwnership.kRuntime
    this.unlink()
    this.callUserFinalizer()
    if (deleteMe) {
      this.dispose()
    }
  }

  public override dispose (): void {
    if (this.id === 0) return
    this.unlink()
    this.persistent.reset()
    this.ctx.deleteHandle(this.id)
    super.dispose()
    this.ctx = undefined!
    this.envObject = undefined!
    this.id = 0
  }
}

export class ReferenceWithData extends Reference {
  private _data: void_p

  public static override create (
    ctx: Context,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): ReferenceWithData
  public static override create (
    ctx: Context,
    envObject: undefined,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): ReferenceWithData

  public static override create (
    ctx: Context,
    envObject: any,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): ReferenceWithData {
    const reference = new ReferenceWithData(
      ctx, envObject, value, initialRefcount, ownership, data
    )
    if (envObject) {
      reference.link(envObject.reflist)
    }
    return reference
  }

  public constructor (
    ctx: Context,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  )
  public constructor (
    ctx: Context,
    envObject: undefined,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  )

  public constructor (
    ctx: Context,
    envObject: any,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ) {
    super(ctx, envObject, value, initialRefcount, ownership)
    this._data = data
  }

  public override copy (): ReferenceWithData {
    const newRef = this._copy(ReferenceWithData)
    newRef._data = this._data
    return newRef
  }

  public override move (target: ReferenceWithData): void {
    this._move(target)
    target._data = this._data
    this._data = 0
  }

  public data (): void_p {
    return this._data
  }
}

export class ReferenceWithFinalizer extends Reference {
  private _finalizer: Finalizer

  public static override create (
    ctx: Context,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): ReferenceWithFinalizer
  public static override create (
    ctx: Context,
    envObject: undefined,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): ReferenceWithFinalizer

  public static override create (
    ctx: Context,
    envObject: any,
    value: any,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): ReferenceWithFinalizer {
    if (!envObject) {
      throw new TypeError('envObject is required for ReferenceWithFinalizer')
    }
    const reference = new ReferenceWithFinalizer(
      ctx, envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint
    )
    reference.link(envObject.finalizing_reflist)
    return reference
  }

  public constructor (
    ctx: Context,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(ctx, envObject, value, initialRefcount, ownership)
    this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  public override copy (): ReferenceWithFinalizer {
    const newRef = this._copy(ReferenceWithFinalizer)
    newRef._finalizer = this._finalizer.copy()
    return newRef
  }

  public override move (target: ReferenceWithFinalizer): void {
    this._move(target)
    this._finalizer.move(target._finalizer)
  }

  public override resetFinalizer (): void {
    this._finalizer.resetFinalizer()
  }

  public override data (): void_p {
    return this._finalizer.data()
  }

  protected override callUserFinalizer (): void {
    this._finalizer.callFinalizer()
  }

  protected override invokeFinalizerFromGC (): void {
    this._finalizer.envObject.invokeFinalizerFromGC(this)
  }

  public override dispose (): void {
    if (!this._finalizer) return
    this._finalizer.envObject.dequeueFinalizer(this)
    this._finalizer.dispose()
    super.dispose()
    this._finalizer = undefined!
  }
}
