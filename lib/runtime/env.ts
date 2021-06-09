// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export const NULL: 0 = 0

  export let errorMessagesPtr: char_p[]

  export const INT64_RANGE_POSITIVE = Math.pow(2, 63)
  export const INT64_RANGE_NEGATIVE = -Math.pow(2, 63)

  class TryCatch {
    private _exception: Error | null = null
    public hasCaught (): boolean {
      return this._exception !== null
    }

    public exception (): Error | null {
      return this._exception
    }

    public setError (err: Error): void {
      this._exception = err
    }

    public reset (): void {
      this._exception = null
    }

    public extractException (): Error | null {
      const e = this._exception
      this._exception = null
      return e
    }
  }

  export class Env implements IStoreValue {
    public id: number
    public openHandleScopes: number = 0
    public napiVersion: number = 0

    public instanceData = {
      data: 0,
      finalize_cb: 0,
      finalize_hint: 0
    }

    public handleStore!: HandleStore
    public scopeStore!: ScopeStore
    public refStore!: RefStore

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
      env.scopeStore = new ScopeStore()
      env.scopeList = new LinkedList<IHandleScope>()
      // env.scopeList.push(HandleScope.create(env.id, null))
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
      return this.handleStore.find(value) || this.getCurrentScope().add(value).id
    }
  }

  class EnvStore extends Store<Env> {
    public constructor () {
      super()
    }
  }

  export const envStore = new EnvStore()

  export function gc (): void {
    envStore.forEach(envObject => {
      envObject.handleStore.forEach(h => {
        h.tryDispose()
      })
    })
  }

  export function initErrorMemory (): void {
    if (!errorMessagesPtr) {
      const errorMessages = [
        '',
        'Invalid argument',
        'An object was expected',
        'A string was expected',
        'A string or symbol was expected',
        'A function was expected',
        'A number was expected',
        'A boolean was expected',
        'An array was expected',
        'Unknown failure',
        'An exception is pending',
        'The async work item was cancelled',
        'napi_escape_handle already called on scope',
        'Invalid handle scope usage',
        'Invalid callback scope usage',
        'Thread-safe function queue is full',
        'Thread-safe function handle is closing',
        'A bigint was expected',
        'A date was expected',
        'An arraybuffer was expected',
        'A detachable arraybuffer was expected',
        'Main thread would deadlock'
      ]
      errorMessagesPtr = errorMessages.map(msg => msg ? allocateUTF8(msg) : 0)
    }
    envStore.forEach((env) => {
      if (!env.napiExtendedErrorInfoPtr) {
        env.napiExtendedErrorInfoPtr = _malloc(16)
      }
    })
  }

  addOnInit(initErrorMemory)

  export function napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    const envObject = envStore.get(env)!
    envObject.napiExtendedErrorInfo.error_code = error_code
    envObject.napiExtendedErrorInfo.engine_error_code = engine_error_code
    envObject.napiExtendedErrorInfo.engine_reserved = engine_reserved

    const ptr32 = envObject.napiExtendedErrorInfoPtr >> 2
    HEAP32[ptr32 + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[ptr32 + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[ptr32 + 3] = envObject.napiExtendedErrorInfo.error_code
    return error_code
  }

  export function napi_clear_last_error (env: napi_env): napi_status {
    const envObject = envStore.get(env)!
    envObject.napiExtendedErrorInfo.error_code = napi_status.napi_ok
    envObject.napiExtendedErrorInfo.engine_error_code = 0
    envObject.napiExtendedErrorInfo.engine_reserved = 0

    const ptr32 = envObject.napiExtendedErrorInfoPtr >> 2
    HEAP32[ptr32 + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[ptr32 + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[ptr32 + 3] = envObject.napiExtendedErrorInfo.error_code
    return napi_status.napi_ok
  }

  export function checkEnv (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    if ((env === NULL) || !envStore.has(env)) return napi_status.napi_invalid_arg
    const envObject = envStore.get(env)!
    return fn(envObject)
  }

  export function checkArgs (env: napi_env, args: any[], fn: () => napi_status): napi_status {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === NULL) {
        return napi_set_last_error(env, napi_status.napi_invalid_arg)
      }
    }
    return fn()
  }

  export function preamble (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    return checkEnv(env, (envObject) => {
      if (envObject.tryCatch.hasCaught()) return napi_set_last_error(env, napi_status.napi_pending_exception)
      napi_clear_last_error(env)
      try {
        return fn(envObject)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return napi_set_last_error(env, napi_status.napi_pending_exception)
      }
    })
  }

  export function getReturnStatus (env: napi_env): napi_status {
    const envObject = envStore.get(env)!
    return !envObject.tryCatch.hasCaught() ? napi_status.napi_ok : napi_set_last_error(env, napi_status.napi_pending_exception)
  }

  export let canSetFunctionName = false
  try {
    canSetFunctionName = !!Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable
  } catch (_) {}
}
