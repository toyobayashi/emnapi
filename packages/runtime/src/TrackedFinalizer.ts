import type { Env } from './env'
import { Finalizer } from './Finalizer'
import { RefTracker } from './RefTracker'

export interface TrackedFinalizer extends Finalizer, RefTracker {}

export class TrackedFinalizer extends Finalizer {
  public static finalizeAll (list: RefTracker): void {
    RefTracker.finalizeAll(list)
  }

  public link (list: RefTracker): void {
    RefTracker.prototype.link.call(this, list)
  }

  public unlink (): void {
    RefTracker.prototype.unlink.call(this)
  }

  public static create (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): TrackedFinalizer {
    return new TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  protected constructor (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super(envObject, finalize_callback, finalize_data, finalize_hint)
    ;(this as any)._next = null
    ;(this as any)._prev = null
    this.link(!finalize_callback ? envObject.reflist : envObject.finalizing_reflist)
  }

  public dispose (): void {
    this.unlink()
    this.envObject.dequeueFinalizer(this)
    super.dispose()
  }

  public finalize (): void {
    this.finalizeCore(true)
  }

  protected finalizeCore (deleteMe: boolean): void {
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
    if (deleteMe) {
      this.dispose()
    }
    if (caught) {
      throw error
    }
  }
}
