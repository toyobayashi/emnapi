import { supportFinalizer } from './util'

class StrongRef<T> {
  private _value: T

  constructor (value: T) {
    this._value = value
  }

  deref (): T {
    return this._value
  }

  dispose (): void {
    this._value = undefined!
  }
}

export class Persistent<T> {
  private _ref: StrongRef<T> | WeakRef<T extends object ? T : never> | undefined
  private _param: any
  private _callback: ((param: any) => void) | undefined

  private static readonly _registry = supportFinalizer
    ? new FinalizationRegistry((value: Persistent<any>) => {
      value._ref = undefined
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
    this._ref = new StrongRef(value)
  }

  setWeak<P> (param: P, callback: (param: P) => void): void {
    if (!supportFinalizer || this._ref === undefined || this._ref instanceof WeakRef) return
    const value = this._ref.deref()
    try {
      // try {
      Persistent._registry.register(value as any, this, this)
      const weakRef = new WeakRef<any>(value)
      this._ref.dispose()
      this._ref = weakRef
      // } catch (_) {
      //   Persistent._registry.register(this._ref, this, this)
      //   this._ref = new WeakRef<any>(this._ref)
      // }
      this._param = param
      this._callback = callback
    } catch (_) {}
  }

  clearWeak (): void {
    if (!supportFinalizer || this._ref === undefined) return
    if (this._ref instanceof WeakRef) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
      this._param = undefined
      this._callback = undefined
      const value = this._ref.deref()
      if (value === undefined) {
        this._ref = value
      } else {
        this._ref = new StrongRef(value as T)
      }
    }
  }

  reset (): void {
    if (supportFinalizer) {
      try {
        Persistent._registry.unregister(this)
      } catch (_) {}
    }
    this._param = undefined
    this._callback = undefined
    if (this._ref instanceof StrongRef) {
      this._ref.dispose()
    }
    this._ref = undefined
  }

  isEmpty (): boolean {
    return this._ref === undefined
  }

  deref (): T | undefined {
    if (this._ref === undefined) return undefined
    return this._ref.deref()
  }
}
