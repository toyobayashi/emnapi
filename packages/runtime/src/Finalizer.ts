import type { Env } from './env'

export class Finalizer {
  private _makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void

  public constructor (
    public envObject: Env,
    private _finalizeCallback: napi_finalize = 0,
    private _finalizeData: void_p = 0,
    private _finalizeHint: void_p = 0
  ) {
    this._makeDynCall_vppp = envObject.makeDynCall_vppp
  }

  public callback (): napi_finalize { return this._finalizeCallback }
  public data (): void_p { return this._finalizeData }
  public hint (): void_p { return this._finalizeHint }

  public resetEnv (): void {
    this.envObject = undefined!
  }

  public resetFinalizer (): void {
    this._finalizeCallback = 0
    this._finalizeData = 0
    this._finalizeHint = 0
  }

  public callFinalizer (): void {
    const finalize_callback = this._finalizeCallback
    const finalize_data = this._finalizeData
    const finalize_hint = this._finalizeHint
    this.resetFinalizer()

    if (!finalize_callback) return

    const fini = Number(finalize_callback)
    if (!this.envObject) {
      this._makeDynCall_vppp(fini)(0, finalize_data, finalize_hint)
    } else {
      this.envObject.callFinalizer(fini, finalize_data, finalize_hint)
    }
  }

  public dispose (): void {
    this.envObject = undefined!
    this._makeDynCall_vppp = undefined!
  }
}
