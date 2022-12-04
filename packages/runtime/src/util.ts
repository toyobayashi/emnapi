/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

declare const __webpack_public_path__: any
declare const global: typeof globalThis

export const supportNewFunction = (function () {
  let f: Function
  try {
    f = new Function()
  } catch (_) {
    return false
  }
  return typeof f === 'function'
})()

export const _global: typeof globalThis = (function () {
  if (typeof globalThis !== 'undefined') return globalThis

  let g = (function (this: any) { return this })()
  if (!g && supportNewFunction) {
    g = new Function('return this')()
  }

  if (!g) {
    if (typeof __webpack_public_path__ === 'undefined') {
      if (typeof global !== 'undefined') return global
    }
    if (typeof window !== 'undefined') return window
    if (typeof self !== 'undefined') return self
  }

  return g
})()

/** @internal */
export class TryCatch {
  private _exception: any = undefined
  private _caught: boolean = false
  public hasCaught (): boolean {
    return this._caught
  }

  public exception (): any {
    return this._exception
  }

  public setError (err: any): void {
    this._exception = err
    this._caught = true
  }

  public reset (): void {
    this._exception = undefined
    this._caught = false
  }

  public extractException (): any {
    const e = this._exception
    this.reset()
    return e
  }
}

export let canSetFunctionName = false
try {
  canSetFunctionName = !!Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable
} catch (_) {}

export const supportReflect = typeof Reflect === 'object'
export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
export const supportBigInt = typeof BigInt !== 'undefined'

export function isReferenceType (v: any): v is object {
  return (typeof v === 'object' && v !== null) || typeof v === 'function'
}
