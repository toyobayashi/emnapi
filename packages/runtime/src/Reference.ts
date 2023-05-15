import type { IStoreValue } from './Store'
import type { Env } from './env'
import { RefBase } from './RefBase'
import { Persistent } from './Persistent'
import type { Handle } from './Handle'

function weakCallback (ref: Reference): void {
  ref.persistent.reset()
  ref.envObject.enqueueFinalizer(ref)
}

function canBeHeldWeakly (value: Handle<any>): boolean {
  return value.isObject() || value.isFunction() || value.isSymbol()
}

export class Reference extends RefBase implements IStoreValue {
  public id: number
  private canBeWeak!: boolean

  public static create (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: 0 | 1,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    const handle = envObject.ctx.handleStore.get(handle_id)!
    const ref = new Reference(envObject, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint)
    envObject.ctx.refStore.add(ref)
    ref.canBeWeak = canBeHeldWeakly(handle)
    ref.persistent = new Persistent(handle.value)

    if (initialRefcount === 0) {
      ref._setWeak()
    }
    return ref
  }

  public persistent!: Persistent<object>

  private constructor (
    envObject: Env,
    initialRefcount: uint32_t,
    ownership: Ownership,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ) {
    super(envObject, initialRefcount >>> 0, ownership, finalize_callback, finalize_data, finalize_hint)
    this.id = 0
  }

  public ref (): number {
    if (this.persistent.isEmpty()) {
      return 0
    }

    const count = super.ref()

    if (count === 1 && this.canBeWeak) {
      this.persistent.clearWeak()
    }

    return count
  }

  public unref (): number {
    if (this.persistent.isEmpty()) {
      return 0
    }

    const oldRefcount = this.refCount()
    const refcount = super.unref()
    if (oldRefcount === 1 && refcount === 0) {
      this._setWeak()
    }
    return refcount
  }

  public get (): napi_value {
    if (this.persistent.isEmpty()) {
      return 0
    }
    const obj = this.persistent.deref()
    const handle = this.envObject.ensureHandle(obj)
    return handle.id
  }

  private _setWeak (): void {
    if (this.canBeWeak) {
      this.persistent.setWeak(this, weakCallback)
    } else {
      this.persistent.reset()
    }
  }

  public override finalize (): void {
    this.persistent.reset()
    super.finalize()
  }

  public override dispose (): void {
    if (this.id === 0) return
    this.persistent.reset()
    this.envObject.ctx.refStore.remove(this.id)
    super.dispose()
    this.id = 0
  }
}
