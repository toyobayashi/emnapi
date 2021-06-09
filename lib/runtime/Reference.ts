// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export class Reference implements IStoreValue {
    public id: number
    public refcount: uint32_t

    private finalizeRan: boolean = false

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
      envObject.handleStore.get(handle_id)!.addRef(ref)
      return ref
    }

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
        envObject.handleStore.get(this.handle_id)!.tryDispose()
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
      }
      return NULL
    }

    public static doDelete (ref: Reference): void {
      if ((ref.refcount !== 0) || (ref.deleteSelf) || (ref.finalizeRan)) {
        const envObject = envStore.get(ref.env)!
        envObject.refStore.remove(ref.id)
        envObject.handleStore.get(ref.handle_id)!.removeRef(ref)
      } else {
        ref.deleteSelf = true
      }
    }

    public dispose (): void {
      if (this.finalize_callback !== NULL) {
        call_viii(this.finalize_callback, this.env, this.finalize_data, this.finalize_hint)
      }
      if (this.deleteSelf) {
        Reference.doDelete(this)
      } else {
        this.finalizeRan = true
        // leak if this is a non-self-delete weak reference
        // should call napi_delete_referece manually
        // Reference.doDelete(this)
      }
    }
  }

  export class RefStore extends Store<Reference> {
    public constructor () {
      super()
    }
  }
}
