import type { Env } from './env'
import { TrackedFinalizer } from './TrackedFinalizer'

export class RefBase extends TrackedFinalizer {
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
    this._refcount = initial_refcount
    this._ownership = ownership
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
    this.finalizeCore(this._ownership === Ownership.kRuntime)
  }
}
