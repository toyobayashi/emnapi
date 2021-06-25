// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export class Env implements IStoreValue {
    public id: number
    public openHandleScopes: number = 0

    public instanceData = {
      data: 0,
      finalize_cb: 0,
      finalize_hint: 0
    }

    public handleStore!: HandleStore
    public scopeStore!: ScopeStore
    public refStore!: RefStore
    public deferredStore!: DeferredStore

    public scopeList = new LinkedList<IHandleScope>()

    public napiExtendedErrorInfo = {
      error_message: 0,
      engine_reserved: 0,
      engine_error_code: 0,
      error_code: napi_status.napi_ok
    }

    public napiExtendedErrorInfoPtr!: Pointer<napi_extended_error_info>

    public tryCatch = new TryCatch()

    public static create (): Env {
      const env = new Env()
      envStore.add(env)
      env.refStore = new RefStore()
      env.handleStore = new HandleStore()
      env.handleStore.addGlobalConstants(env.id)
      env.deferredStore = new DeferredStore()
      env.scopeStore = new ScopeStore()
      env.scopeList = new LinkedList<IHandleScope>()
      // env.scopeList.push(HandleScope.create(env.id, null))
      env.napiExtendedErrorInfoPtr = call_malloc(16)
      return env
    }

    private constructor () {
      this.id = 0
    }

    public openScope<Scope extends HandleScope> (ScopeConstructor: { create: (env: napi_env, parent: IHandleScope | null) => Scope }): Scope {
      const scope = ScopeConstructor.create(this.id, this.getCurrentScope() ?? null)
      this.scopeList.push(scope)
      this.openHandleScopes++
      return scope
    }

    public closeScope (scope: IHandleScope): void {
      scope.dispose()
      this.scopeList.pop()
      this.openHandleScopes--
    }

    public callInNewScope<Scope extends HandleScope, Args extends any[], ReturnValue = any> (
      ScopeConstructor: { create: (env: napi_env, parent: IHandleScope | null) => Scope },
      fn: (scope: Scope, ...args: Args) => ReturnValue,
      ...args: Args
    ): ReturnValue {
      const scope = this.openScope(ScopeConstructor)
      let ret: ReturnValue
      try {
        ret = fn(scope, ...args)
      } catch (err) {
        this.tryCatch.setError(err)
      }
      this.closeScope(scope)
      return ret!
    }

    public callInNewHandleScope<Args extends any[], T = any> (fn: (scope: HandleScope, ...args: Args) => T, ...args: Args): T {
      return this.callInNewScope(HandleScope, fn, ...args)
    }

    public callInNewEscapableHandleScope<Args extends any[], T = any> (fn: (scope: EscapableHandleScope, ...args: Args) => T, ...args: Args): T {
      return this.callInNewScope(EscapableHandleScope, fn, ...args)
    }

    public getCurrentScope (): IHandleScope {
      return this.scopeList.last.element
    }

    public ensureHandleId (value: any): napi_value {
      if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        const h = this.handleStore.findObjectHandle(value)
        if (h != null) {
          if (h.value === undefined) {
            const currentScope = this.getCurrentScope()
            h.value = value
            Store.prototype.add.call(this.handleStore, h)
            currentScope.addNoCopy(h)
            return h.id
          } else {
            return h.id
          }
        } else {
          return this.getCurrentScope().add(value).id
        }
      } else {
        return this.handleStore.findStoreHandleId(value) || this.getCurrentScope().add(value).id
      }
    }

    public callIntoModule<T> (fn: (env: Env, scope: IHandleScope) => T): T {
      const r = this.callInNewHandleScope((scope) => {
        napi_clear_last_error(this.id)
        return fn(this, scope)
      })
      if (this.tryCatch.hasCaught()) {
        const err = this.tryCatch.extractException()!
        throw err
      }
      return r
    }

    public dispose (): void {
      this.scopeList.clear()
      this.deferredStore.dispose()
      this.refStore.dispose()
      this.scopeStore.dispose()
      this.handleStore.dispose()
      this.tryCatch.extractException()
      try {
        _free(this.napiExtendedErrorInfoPtr)
      } catch (_) {}
      envStore.remove(this.id)
    }
  }
}
