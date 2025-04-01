import type { Env } from './env'
import { Persistent } from './Persistent'
import type { Handle } from './Handle'
import { RefTracker } from './RefTracker'
import { Finalizer } from './Finalizer'

export enum ReferenceOwnership {
  kRuntime,
  kUserland
}

function canBeHeldWeakly (value: Handle<any>): boolean {
  return value.isObject() || value.isFunction() || value.isSymbol()
}

export class Reference extends RefTracker {
  private static weakCallback (ref: Reference): void {
    ref.persistent.reset()
    ref.invokeFinalizerFromGC()
  }

  public id: number
  public envObject!: Env

  private readonly canBeWeak!: boolean
  private _refcount: number
  private readonly _ownership: ReferenceOwnership
  public persistent!: Persistent<object>

  public static create (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    _unused1?: void_p,
    _unused2?: void_p,
    _unused3?: void_p
  ): Reference {
    const ref = new Reference(
      envObject, handle_id, initialRefcount, ownership
    )
    ref.link(envObject.reflist)
    return ref
  }

  public constructor (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ) {
    super()
    this.envObject = envObject
    this._refcount = initialRefcount
    this._ownership = ownership
    const handle = envObject.ctx.handleStore.deref(handle_id)!
    this.canBeWeak = canBeHeldWeakly(handle)
    this.persistent = new Persistent(handle.value)
    this.id = 0
    if (initialRefcount === 0) {
      this._setWeak()
    }
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

  public get (envObject = this.envObject): napi_value {
    if (this.persistent.isEmpty()) {
      return 0
    }
    const obj = this.persistent.deref()
    const handle = envObject.ctx.handleFromJsValue(obj)
    return handle.id
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
    if (this.canBeWeak) {
      this.persistent.setWeak(this, Reference.weakCallback)
    } else {
      this.persistent.reset()
    }
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
    this.envObject.ctx.refStore.dealloc(this.id)
    super.dispose()
    this.envObject = undefined!
    this.id = 0
  }
}

export class ReferenceWithData extends Reference {
  public static override create (
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): ReferenceWithData {
    const reference = new ReferenceWithData(
      envObject, value, initialRefcount, ownership, data
    )
    reference.link(envObject.reflist)
    return reference
  }

  public constructor (
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    private readonly _data: void_p
  ) {
    super(envObject, value, initialRefcount, ownership)
  }

  public data (): void_p {
    return this._data
  }
}

export class ReferenceWithFinalizer extends Reference {
  private _finalizer: Finalizer

  public static override create (
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): ReferenceWithFinalizer {
    const reference = new ReferenceWithFinalizer(
      envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint
    )
    reference.link(envObject.finalizing_reflist)
    return reference
  }

  public constructor (
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(envObject, value, initialRefcount, ownership)
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
