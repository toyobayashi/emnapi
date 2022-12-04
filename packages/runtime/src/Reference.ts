import type { IStoreValue } from './Store'
import { supportFinalizer, isReferenceType } from './util'
import type { Env } from './env'
import type { Handle } from './Handle'
import { RefBase } from './RefBase'

/** @internal */
export class Reference extends RefBase implements IStoreValue {
  public id: number

  private finalizerRegistered: boolean = false

  public static finalizationGroup: FinalizationRegistry<any> | null =
    supportFinalizer
      ? new FinalizationRegistry((ref: Reference) => {
        ref.finalize(false)
      })
      : null

  public static create (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    deleteSelf: boolean,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    const handle = envObject.ctx.handleStore.get(handle_id)!
    const ref = new Reference(envObject, handle, initialRefcount, deleteSelf, finalize_callback, finalize_data, finalize_hint)
    envObject.ctx.refStore.add(ref)
    handle.addRef(ref)
    if (supportFinalizer && isReferenceType(handle.value)) {
      ref.objWeakRef = new WeakRef<object>(handle.value)
    } else {
      ref.objWeakRef = null
    }

    if (initialRefcount === 0) {
      ref._setWeak(handle.value)
    }
    return ref
  }

  public objWeakRef!: WeakRef<object> | null

  private constructor (
    public envObject: Env,
    public handle: Handle<any>,
    initialRefcount: uint32_t,
    deleteSelf: boolean,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ) {
    super(envObject, initialRefcount >>> 0, deleteSelf, finalize_callback, finalize_data, finalize_hint)
    this.id = 0
  }

  public ref (): number {
    const count = super.ref()

    if (count === 1 && this.objWeakRef) {
      const obj = this.objWeakRef.deref()
      if (obj) {
        const handle = this.envObject.ensureHandle(obj)
        handle.addRef(this)
        this._clearWeak()
        if (handle !== this.handle) {
          this.handle.removeRef(this)
          this.handle = handle
        }
      }
    }

    return count
  }

  public unref (): number {
    const oldRefcount = this.refCount()
    const refcount = super.unref()
    if (oldRefcount === 1 && refcount === 0) {
      if (this.objWeakRef) {
        const obj = this.objWeakRef.deref()
        if (obj) {
          this._setWeak(obj)
        }
      }
      this.handle.tryDispose()
    }
    return refcount
  }

  public get (): napi_value {
    if (this.objWeakRef) {
      const obj = this.objWeakRef.deref()
      if (obj) {
        const handle = this.envObject.ensureHandle(obj)
        handle.addRef(this)
        if (handle !== this.handle) {
          this.handle.removeRef(this)
          this.handle = handle
        }
        return handle.id
      }
    } else {
      if (this.handle?.value) {
        return this.handle.id
      }
    }
    return 0
  }

  private _setWeak (value: object): void {
    if (!supportFinalizer || this.finalizerRegistered) return
    Reference.finalizationGroup!.register(value, this, this)
    this.finalizerRegistered = true
  }

  private _clearWeak (): void {
    if (!supportFinalizer || !this.finalizerRegistered) return
    try {
      this.finalizerRegistered = false
      Reference.finalizationGroup!.unregister(this)
    } catch (_) {}
  }

  /* public queueFinalizer (value?: object): void {
    if (!Reference.finalizationGroup) return
    if (this.finalizerRegistered) return
    if (!value) {
      value = this.objWeakRef!.deref()!
    }
    Reference.finalizationGroup.register(value, this, this)
    this.finalizerRegistered = true
  } */

  public override finalize (isEnvTeardown = false): void {
    if (isEnvTeardown) {
      this._clearWeak()
    }

    super.finalize(isEnvTeardown)
  }

  public override dispose (): void {
    if (this.id === 0) return
    this.envObject.ctx.refStore.remove(this.id)
    this.handle.removeRef(this)
    this._clearWeak()
    this.handle = undefined!
    super.dispose()
    this.id = 0
  }
}
