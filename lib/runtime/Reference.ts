// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export class Reference implements IStoreValue {
    public id: number
    public refcount: uint32_t

    private finalizeRan: boolean = false

    private finalizerRegistered: boolean = false

    public static finalizationGroup: FinalizationRegistry | null =
    typeof FinalizationRegistry !== 'undefined'
      ? new FinalizationRegistry((ref: Reference) => {
        let envObject: Env | undefined
        if (ref.finalize_callback !== NULL) {
          envObject = envStore.get(ref.env)!
          envObject.callInNewHandleScope(() => {
            call_viii(ref.finalize_callback, ref.env, ref.finalize_data, ref.finalize_hint)
          })
        }
        if (ref.deleteSelf) {
          Reference.doDelete(ref)
        } else {
          ref.finalizeRan = true
          // leak if this is a non-self-delete weak reference
          // should call napi_delete_referece manually
          // Reference.doDelete(this)
        }
        if (envObject) {
          if (envObject.tryCatch.hasCaught()) {
            const e = envObject.tryCatch.extractException()
            throw e
          }
        }
      })
      : null

    public static create (
      env: napi_env,
      handle_id: napi_value,
      initialRefcount: uint32_t,
      deleteSelf: boolean,
      finalize_callback: napi_finalize = 0,
      finalize_data: void_p = 0,
      finalize_hint: void_p = 0
    ): Reference {
      const ref = new Reference(env, handle_id, initialRefcount, deleteSelf, finalize_callback, finalize_data, finalize_hint)
      const envObject = envStore.get(env)!
      envObject.refStore.add(ref)
      const handle = envObject.handleStore.get(handle_id)!
      handle.addRef(ref)
      if (supportFinalizer && ((typeof handle.value === 'object' && handle.value !== null) || typeof handle.value === 'function')) {
        ref.objWeakRef = new WeakRef<object>(handle.value)
      } else {
        ref.objWeakRef = null
      }
      return ref
    }

    public objWeakRef!: WeakRef<object> | null

    private constructor (
      public env: napi_env,
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
        const envObject = envStore.get(this.env)!
        const handle = envObject.handleStore.get(this.handle_id)
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
      const envObject = envStore.get(this.env)!
      if (envObject.handleStore.has(this.handle_id)) {
        return this.handle_id
      } else {
        if (this.objWeakRef) {
          const obj = this.objWeakRef.deref()
          if (obj) {
            this.handle_id = envObject.ensureHandleId(obj)
            return this.handle_id
          }
        }
        return NULL
      }
    }

    public static doDelete (ref: Reference): void {
      if ((ref.refcount !== 0) || (ref.deleteSelf) || (ref.finalizeRan)) {
        const envObject = envStore.get(ref.env)!
        envObject.refStore.remove(ref.id)
        envObject.handleStore.get(ref.handle_id)?.removeRef(ref)
        Reference.finalizationGroup?.unregister(this)
      } else {
        ref.deleteSelf = true
      }
    }

    public queueFinalizer (): void {
      if (!Reference.finalizationGroup) return
      if (this.finalizerRegistered) return
      const envObject = envStore.get(this.env)!
      const handle = envObject.handleStore.get(this.handle_id)!
      Reference.finalizationGroup.register(handle.value, this, this)
      this.finalizerRegistered = true
    }
  }

  export class RefStore extends Store<Reference> {
    public constructor () {
      super()
    }
  }
}
