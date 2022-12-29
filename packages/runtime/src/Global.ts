import { supportFinalizer } from './util'

/** @public */
export class Persistent<T extends object> {
  private _ref: T | WeakRef<T> | null
  private _param: any
  private _callback: ((param: any) => void) | undefined

  private static readonly _registry = supportFinalizer
    ? new FinalizationRegistry((value: Persistent<any>) => {
      value._ref = null
      const callback = value._callback
      const param = value._param
      value._callback = undefined
      value._param = undefined
      if (typeof callback === 'function') {
        callback(param)
      }
    })
    : undefined!

  constructor (value: T) {
    this._ref = value
  }

  setWeak<P> (param: P, callback: (param: P) => void): void {
    if (this._ref === null) return
    if (!supportFinalizer) return
    if (this._ref instanceof WeakRef) return
    this._param = param
    this._callback = callback
    Persistent._registry.register(this._ref, this, this)
    this._ref = new WeakRef<T>(this._ref)
  }

  clearWeak (): void {
    if (this._ref === null) return
    if (!supportFinalizer) return
    if (this._ref instanceof WeakRef) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
      this._param = undefined
      this._callback = undefined
      this._ref = this._ref.deref() as T
    }
  }

  reset (other?: T | WeakRef<T>): void {
    if (supportFinalizer) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
    }
    this._param = undefined
    this._callback = undefined
    if (other) {
      this._ref = other
    } else {
      this._ref = null
    }
  }

  isEmpty (): boolean {
    return this._ref === null
  }

  deref (): T | undefined {
    if (!supportFinalizer) {
      return (this._ref as T | null) ?? undefined
    }

    if (this._ref === null) return undefined

    if (this._ref instanceof WeakRef) {
      return this._ref.deref()
    }

    return this._ref
  }
}
