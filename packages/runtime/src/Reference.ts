import { IStoreValue, Store } from './Store'
import { supportFinalizer, isReferenceType } from './util'
import type { Env } from './env'

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
          const scope = ref.envObject.openScope()
          try {
            ref.envObject.callIntoModule((envObject) => {
              envObject.call_viii(ref.finalize_callback, envObject.id, ref.finalize_data, ref.finalize_hint)
              ref.finalize_callback = NULL
            })
          } catch (err) {
            caught = true
            error = err
          }
          ref.envObject.closeScope(scope)
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
    const ref = new Reference(envObject, handle_id, initialRefcount, deleteSelf, finalize_callback, finalize_data, finalize_hint)
    envObject.refStore.add(ref)
    const handle = envObject.handleStore.get(handle_id)!
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
    public handle_id: napi_value,
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
    if (this.refcount === 0) {
      const handle = this.envObject.handleStore.get(this.handle_id)
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
    if (this.envObject.handleStore.has(this.handle_id)) {
      return this.handle_id
    } else {
      if (this.objWeakRef) {
        const obj = this.objWeakRef.deref()
        if (obj) {
          this.handle_id = this.envObject.ensureHandleId(obj)
          return this.handle_id
        }
      }
      return NULL
    }
  }

  public static doDelete (ref: Reference): void {
    if ((ref.refcount !== 0) || (ref.deleteSelf) || (ref.finalizeRan)) {
      ref.envObject.refStore.remove(ref.id)
      ref.envObject.handleStore.get(ref.handle_id)?.removeRef(ref)
      Reference.finalizationGroup?.unregister(this)
    } else {
      ref.deleteSelf = true
    }
  }

  public queueFinalizer (): void {
    if (!Reference.finalizationGroup) return
    if (this.finalizerRegistered) return
    const handle = this.envObject.handleStore.get(this.handle_id)!
    Reference.finalizationGroup.register(handle.value, this, this)
    this.finalizerRegistered = true
  }

  public dispose (): void {
    this.deleteSelf = true
    Reference.doDelete(this)
  }
}

export class RefStore extends Store<Reference> {
  public constructor () {
    super()
  }
}
