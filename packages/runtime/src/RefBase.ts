import type { Env } from './env'
import { Finalizer } from './Finalizer'
import { RefTracker } from './RefTracker'

/** @internal */
export interface RefBase extends Finalizer, RefTracker {}

/** @public */
export enum Ownership {
  kRuntime,
  kUserland
}

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
  private readonly _ownership: Ownership

  constructor (
    envObject: Env,
    initial_refcount: uint32_t,
    ownership: number,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(envObject, finalize_callback, finalize_data, finalize_hint)
    ;(this as any)._next = null
    ;(this as any)._prev = null
    this._refcount = initial_refcount
    this._ownership = ownership

    this.link(!finalize_callback ? envObject.reflist : envObject.finalizing_reflist)
  }

  public dispose (): void {
    this.unlink()
    this.envObject.dequeueFinalizer(this)
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

  public ownership (): number {
    return this._ownership
  }

  public finalize (): void {
    const ownership = this._ownership
    // Swap out the field finalize_callback so that it can not be accidentally
    // called more than once.
    const finalize_callback = this._finalizeCallback
    const finalize_data = this._finalizeData
    const finalize_hint = this._finalizeHint
    this.resetFinalizer()

    this.unlink()

    let error: any
    let caught = false
    if (finalize_callback) {
      const fini = Number(finalize_callback)
      try {
        this.envObject.callFinalizer(fini, finalize_data, finalize_hint)
      } catch (err) {
        caught = true
        error = err
      }
    }
    if (ownership === Ownership.kRuntime) {
      this.dispose()
    }
    if (caught) {
      throw error
    }
  }
}
