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
      finalize_callback: napi_finalize,
      finalize_data: void_p,
      finalize_hint: void_p
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
      public finalize_callback: napi_finalize,
      public finalize_data: void_p,
      public finalize_hint: void_p
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

    public doDelete (): void {
      if ((this.refcount !== 0) || (this.deleteSelf) || (this.finalizeRan)) {
        const envObject = envStore.get(this.env)!
        envObject.refStore.remove(this.id)
        envObject.handleStore.get(this.handle_id)!.removeRef(this)
      } else {
        this.deleteSelf = true
      }
    }

    public dispose (): void {
      if (this.finalize_callback !== NULL) {
        call_viii(this.finalize_callback, this.env, this.finalize_data, this.finalize_hint)
      }
      if (this.deleteSelf) {
        this.doDelete()
      } else {
        this.finalizeRan = true
        this.doDelete()
      }
    }
  }

  export class RefStore extends Store<Reference> {
    public constructor () {
      super()
    }
  }
}
