import type { Env } from './env'

export class Finalizer {
  public constructor (
    public envObject: Env,
    protected _finalizeCallback: napi_finalize = 0,
    protected _finalizeData: void_p = 0,
    protected _finalizeHint: void_p = 0
  ) {}

  public callback (): napi_finalize { return this._finalizeCallback }
  public data (): void_p { return this._finalizeData }
  public hint (): void_p { return this._finalizeHint }

  public resetFinalizer (): void {
    this._finalizeCallback = 0
    this._finalizeData = 0
    this._finalizeHint = 0
  }

  public dispose (): void {
    this.envObject = undefined!
  }
}
