import type { IStoreValue } from './Store'
import { supportFinalizer, isReferenceType } from './util'
import type { Env } from './env'
import { refStore } from './RefStore'
import { handleStore } from './Handle'
import type { Handle } from './Handle'
import { HandleScope } from './HandleScope'
import { closeScope, openScope } from './scope'

export class Reference implements IStoreValue {
  public id: number
  public refcount: uint32_t

  private finalizeRan: boolean = false

  private finalizerRegistered: boolean = false

  public static finalizationGroup: FinalizationRegistry<any> | null =
    typeof FinalizationRegistry !== 'undefined'
      ? new FinalizationRegistry((ref: Reference) => {
        let error: any
        let caught = false
        if (ref.finalize_callback !== NULL) {
          const scope = openScope(ref.envObject, HandleScope)
          try {
            ref.envObject.callIntoModule((envObject) => {
              envObject.emnapiGetDynamicCalls.call_viii(ref.finalize_callback, envObject.id, ref.finalize_data, ref.finalize_hint)
              ref.finalize_callback = NULL
            })
          } catch (err) {
            caught = true
            error = err
          }
          closeScope(ref.envObject, scope)
        }
        if (ref.deleteSelf) {
          Reference.doDelete(ref)
        } else {
          ref.finalizeRan = true
          // leak if this is a non-self-delete weak reference
          // should call napi_delete_referece manually
          // Reference.doDelete(this)
        }
        if (caught) {
          throw error
        }
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
    const handle = handleStore.get(handle_id)!
    const ref = new Reference(envObject, supportFinalizer ? new WeakRef(handle) : null, initialRefcount, deleteSelf, finalize_callback, finalize_data, finalize_hint)
    refStore.add(ref)
    handle.addRef(ref)
    if (supportFinalizer && isReferenceType(handle.value)) {
      ref.objWeakRef = new WeakRef<object>(handle.value)
    } else {
      ref.objWeakRef = null
    }
    return ref
  }

  public objWeakRef!: WeakRef<object> | null

  private constructor (
    public envObject: Env,
    public handleWeakRef: WeakRef<Handle<any>> | null,
    initialRefcount: uint32_t,
    public deleteSelf: boolean,
    public finalize_callback: napi_finalize = 0,
    public finalize_data: void_p = 0,
    public finalize_hint: void_p = 0
  ) {
    this.id = 0
    this.refcount = initialRefcount >>> 0
  }

  public ref (): number {
    return ++this.refcount
  }

  public unref (): number {
    if (this.refcount === 0) {
      return 0
    }
    this.refcount--
    if (this.refcount === 0 && this.handleWeakRef) {
      const handle = this.handleWeakRef.deref()
      if (handle) {
        handle.tryDispose()
      }
    }
    return this.refcount
  }

  public data (): void_p {
    return this.finalize_data
  }

  public get (): napi_value {
    if (this.objWeakRef) {
      const obj = this.objWeakRef.deref()
      if (obj) {
        const handle = this.envObject.ensureHandle(obj)
        if (supportFinalizer) this.handleWeakRef = new WeakRef(handle)
        return handle.id
      }
    }
    return NULL
  }

  public static doDelete (ref: Reference): void {
    if ((ref.refcount !== 0) || (ref.deleteSelf) || (ref.finalizeRan)) {
      refStore.remove(ref.id)
      ref.handleWeakRef?.deref()?.removeRef(ref)
      Reference.finalizationGroup?.unregister(this)
    } else {
      ref.deleteSelf = true
    }
  }

  public queueFinalizer (value?: object): void {
    if (!Reference.finalizationGroup) return
    if (this.finalizerRegistered) return
    if (!value) {
      value = this.objWeakRef!.deref()!
    }
    Reference.finalizationGroup.register(value, this, this)
    this.finalizerRegistered = true
  }

  public dispose (): void {
    this.deleteSelf = true
    Reference.doDelete(this)
  }
}
