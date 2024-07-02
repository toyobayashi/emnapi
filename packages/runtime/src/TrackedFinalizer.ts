import type { Env } from './env'
import { Finalizer } from './Finalizer'
import { RefTracker } from './RefTracker'

export class TrackedFinalizer extends RefTracker {
  private _finalizer: Finalizer

  public static create (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): TrackedFinalizer {
    const finalizer = new TrackedFinalizer(envObject, finalize_callback, finalize_data, finalize_hint)
    finalizer.link(envObject.finalizing_reflist)
    return finalizer
  }

  private constructor (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ) {
    super()
    this._finalizer = new Finalizer(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  public data (): void_p {
    return this._finalizer.data()
  }

  public override dispose (): void {
    if (!this._finalizer) return
    this.unlink()
    this._finalizer.envObject.dequeueFinalizer(this)
    this._finalizer.dispose()
    this._finalizer = undefined!
    super.dispose()
  }

  public override finalize (): void {
    this.unlink()

    let error: any
    let caught = false

    try {
      this._finalizer.callFinalizer()
    } catch (err) {
      caught = true
      error = err
    }
    this.dispose()
    if (caught) {
      throw error
    }
  }
}
