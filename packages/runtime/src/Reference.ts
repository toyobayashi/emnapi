import type { Env } from './env'
import { Persistent } from './Persistent'
import { RefTracker } from './RefTracker'
import { Finalizer } from './Finalizer'
import type { ArrayStore } from './Store'

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
  public envObject!: Env
  private store: ArrayStore<Reference>

  private readonly canBeWeak!: boolean
  private _refcount: number
  private readonly _ownership: ReferenceOwnership
  public persistent!: Persistent<object>

  public static create (
    store: ArrayStore<Reference>,
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    _unused1?: void_p,
    _unused2?: void_p,
    _unused3?: void_p
  ): Reference {
    const ref = new Reference(
      store, envObject, handle_id, initialRefcount, ownership
    )
    ref.link(envObject.reflist)
    return ref
  }

  public constructor (
    store: ArrayStore<Reference>,
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ) {
    super()
    this.envObject = envObject
    this._refcount = initialRefcount
    this._ownership = ownership
    const value = envObject.ctx.jsValueFromNapiValue(handle_id)!
    this.canBeWeak = canBeHeldWeakly(value)
    this.persistent = new Persistent(value)
    this.id = 0
    this.store = store
    store.insert(this)
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
    return envObject.ctx.napiValueFromJsValue(obj)
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
    this.store.dealloc(this.id)
    super.dispose()
    this.envObject = undefined!
    this.id = 0
  }
}

export class ReferenceWithData extends Reference {
  public static override create (
    store: ArrayStore<Reference>,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): ReferenceWithData {
    const reference = new ReferenceWithData(
      store, envObject, value, initialRefcount, ownership, data
    )
    reference.link(envObject.reflist)
    return reference
  }

  public constructor (
    store: ArrayStore<Reference>,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    private readonly _data: void_p
  ) {
    super(store, envObject, value, initialRefcount, ownership)
  }

  public data (): void_p {
    return this._data
  }
}

export class ReferenceWithFinalizer extends Reference {
  private _finalizer: Finalizer

  public static override create (
    store: ArrayStore<Reference>,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): ReferenceWithFinalizer {
    const reference = new ReferenceWithFinalizer(
      store, envObject, value, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint
    )
    reference.link(envObject.finalizing_reflist)
    return reference
  }

  public constructor (
    store: ArrayStore<Reference>,
    envObject: Env,
    value: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(store, envObject, value, initialRefcount, ownership)
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
