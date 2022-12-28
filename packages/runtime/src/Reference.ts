import type { IStoreValue } from './Store'
import { supportFinalizer, isReferenceType } from './util'
import type { Env } from './env'
import type { Handle } from './Handle'
import { Ownership, RefBase } from './RefBase'
import { Global } from './Global'

function weakCallback (ref: Reference): void {
  ref.persistent!.reset()
  ref.envObject.enqueueFinalizer(ref)
}

/** @internal */
export class Reference extends RefBase implements IStoreValue {
  public id: number

  public static create (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: Ownership,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    const handle = envObject.ctx.handleStore.get(handle_id)!
    const ref = new Reference(envObject, handle, initialRefcount, ownership, finalize_callback, finalize_data, finalize_hint)
    envObject.ctx.refStore.add(ref)
    if (supportFinalizer && isReferenceType(handle.value)) {
      ref.persistent = new Global<object>(handle.value)
    } else {
      ref.persistent = null
    }

    if (initialRefcount === 0) {
      ref._setWeak()
    }
    return ref
  }

  public persistent!: Global<object> | null

  private constructor (
    public envObject: Env,
    public handle: Handle<any>,
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
    if (this.persistent?.isEmpty()) {
      return 0
    }

    const count = super.ref()

    if (count === 1 && this.persistent) {
      const obj = this.persistent.deref()
      if (obj) {
        const handle = this.envObject.ensureHandle(obj)
        this.persistent.clearWeak()
        if (handle !== this.handle) {
          this.handle = handle
        }
      }
    }

    return count
  }

  public unref (): number {
    if (this.persistent?.isEmpty()) {
      return 0
    }

    const oldRefcount = this.refCount()
    const refcount = super.unref()
    if (oldRefcount === 1 && refcount === 0) {
      if (this.persistent) {
        const obj = this.persistent.deref()
        if (obj) {
          this._setWeak()
        }
      }
      this.handle.tryDispose()
    }
    return refcount
  }

  public get (): napi_value {
    if (this.persistent) {
      const obj = this.persistent.deref()
      if (obj) {
        const handle = this.envObject.ensureHandle(obj)
        if (handle !== this.handle) {
          this.handle = handle
        }
        return handle.id
      }
    } else {
      if (this.handle?.value) {
        return this.handle.id
      }
    }
    return 0
  }

  private _setWeak (): void {
    this.persistent?.setWeak(this, weakCallback)
  }

  public override finalize (): void {
    this.persistent?.reset()
    super.finalize()
  }

  public override dispose (): void {
    if (this.id === 0) return
    this.persistent?.reset()
    this.envObject.ctx.refStore.remove(this.id)
    this.handle = undefined!
    super.dispose()
    this.id = 0
  }
}
