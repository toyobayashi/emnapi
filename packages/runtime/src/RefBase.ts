import type { Env } from './env'
import { Finalizer } from './Finalizer'
import { RefTracker } from './RefTracker'
import { supportFinalizer } from './util'

/** @internal */
export interface RefBase extends Finalizer, RefTracker {}

/** @internal */
export class RefBase extends Finalizer {
  public static finalizeAll (list: RefTracker): void {
    RefTracker.finalizeAll(list)
  }

  public link (list: RefTracker): void {
    RefTracker.prototype.link.call(this, list)
  }

  public unlink (): void {
    RefTracker.prototype.unlink.call(this)
  }

  private _refcount: uint32_t
  private _deleteSelf: boolean

  constructor (
    envObject: Env,
    initial_refcount: uint32_t,
    delete_self: boolean,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(envObject, finalize_callback, finalize_data, finalize_hint)
    ;(this as any)._next = null
    ;(this as any)._prev = null
    this._refcount = initial_refcount
    this._deleteSelf = delete_self

    this.link(!finalize_callback ? envObject.reflist : envObject.finalizing_reflist)
  }

  public dispose (): void {
    this.unlink()
    super.dispose()
  }

  public data (): void_p {
    return this._finalizeData
  }

  public ref (): uint32_t {
    return ++this._refcount
  }

  public unref (): uint32_t {
    if (this._refcount === 0) {
      return 0
    }
    return --this._refcount
  }

  public refCount (): uint32_t {
    return this._refcount
  }

  public static doDelete (reference: RefBase): void {
    if ((reference.refCount() !== 0) || (reference._deleteSelf) ||
        (reference._finalizeRan) || !supportFinalizer) {
      reference.dispose()
    } else {
      // defer until finalizer runs as
      // it may already be queued
      reference._deleteSelf = true
    }
  }

  protected finalize (isEnvTeardown = false): void {
    if (isEnvTeardown && this.refCount() > 0) this._refcount = 0

    let error: any
    let caught = false
    if (this._finalizeCallback) {
      const fini = Number(this._finalizeCallback)
      this._finalizeCallback = 0
      try {
        this.envObject.callFinalizer(fini, this._finalizeData, this._finalizeHint)
      } catch (err) {
        caught = true
        error = err
      }
    }
    if (this._deleteSelf || isEnvTeardown) {
      RefBase.doDelete(this)
    } else {
      this._finalizeRan = true
      // leak if this is a non-self-delete weak reference
      // should call napi_delete_referece manually
      // Reference.doDelete(this)
    }
    if (caught) {
      throw error
    }
  }
}
