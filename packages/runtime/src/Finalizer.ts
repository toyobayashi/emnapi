import type { Env } from './env'

export const enum EnvReferenceMode {
  kNoEnvReference,
  kKeepEnvReference
}

export class Finalizer {
  protected _hasEnvReference: boolean
  protected _finalizeRan: boolean

  public constructor (
    protected envObject: Env,
    protected _finalizeCallback: napi_finalize = 0,
    protected _finalizeData: void_p = 0,
    protected _finalizeHint: void_p = 0,
    refmode: EnvReferenceMode = EnvReferenceMode.kNoEnvReference
  ) {
    this._finalizeRan = false
    this._hasEnvReference = refmode === EnvReferenceMode.kKeepEnvReference
    if (this._hasEnvReference) {
      envObject.ref()
    }
  }

  public dispose (): void {
    if (this._hasEnvReference) {
      this.envObject.unref()
    }
    this.envObject = undefined!
  }
}
