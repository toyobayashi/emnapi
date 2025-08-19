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
    const persistent = ref.getPersistent()
    persistent.reset()
    ref.invokeFinalizerFromGC()
  }

  public id: number
  public envObject: Env | undefined
  private ctx: Context

  private canBeWeak!: boolean
  private _refcount: number
  private _ownership: ReferenceOwnership

  public static create (
    ctx: Context,
    envObject: Env,
    handle_id: napi_value,
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
  ) {
    super()
    this.envObject = envObject
    this._refcount = initialRefcount
    this._ownership = ownership
    const value = envObject ? envObject.ctx.jsValueFromNapiValue(handle_id)! : handle_id
    this.canBeWeak = canBeHeldWeakly(value)
    // this.persistent = new Persistent(ctx.isolate, value)
    this.ctx = ctx
    this.id = new Persistent(ctx.isolate, value).id
    ctx.refStore.set(this.id, this)
    if (initialRefcount === 0) {
      this._setWeak()
    }
  }

  public getPersistent (): Persistent<any> {
    return this.ctx.isolate.getRef(this.id)!
  }

  public ref (): number {
    const persistent = this.getPersistent()
    if (persistent.isEmpty()) {
      return 0
    }

    if (++this._refcount === 1 && this.canBeWeak) {
      persistent.clearWeak()
    }

    return this._refcount
  }

  public unref (): number {
    const persistent = this.getPersistent()
    if (persistent.isEmpty() || this._refcount === 0) {
      return 0
    }

    if (--this._refcount === 0) {
      this._setWeak()
    }
    return this._refcount
  }

  public deref (): any {
    const persistent = this.getPersistent()
    return persistent.deref()
  }

  public get (): napi_value {
    const persistent = this.getPersistent()
    if (persistent.isEmpty()) {
      return 0
    }
    return persistent.slot()
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
    const persistent = this.getPersistent()
    if (this.canBeWeak) {
      persistent.setWeak(data, callback)
    } else {
      persistent.reset()
    }
  }

  public clearWeak (): void {
    const persistent = this.getPersistent()
    persistent.clearWeak()
  }

  public override finalize (): void {
    const persistent = this.getPersistent()
    persistent.reset()
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
    this.ctx.isolate.removeRef(this.id)
    this.ctx.refStore.delete(this.id)
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
  ) {
    super(ctx, envObject, value, initialRefcount, ownership)
    this._data = data
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
