// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export const NULL: 0 = 0

  export enum napi_status {
    napi_ok,
    napi_invalid_arg,
    napi_object_expected,
    napi_string_expected,
    napi_name_expected,
    napi_function_expected,
    napi_number_expected,
    napi_boolean_expected,
    napi_array_expected,
    napi_generic_failure,
    napi_pending_exception,
    napi_cancelled,
    napi_escape_called_twice,
    napi_handle_scope_mismatch,
    napi_callback_scope_mismatch,
    napi_queue_full,
    napi_closing,
    napi_bigint_expected,
    napi_date_expected,
    napi_arraybuffer_expected,
    napi_detachable_arraybuffer_expected,
    napi_would_deadlock // unused
  }

  export const errorMessages = [
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

  export let errorMessagesPtr: char_p[]

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
    public instanceData = {
      data: 0,
      finalize_cb: 0,
      finalize_hint: 0
    }

    public handleStore!: HandleStore
    public scopeStore!: ScopeStore

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
      env.handleStore = new HandleStore(env.id)
      env.scopeStore = new ScopeStore()
      env.scopeList = new LinkedList<IHandleScope>()
      env.scopeList.push(HandleScope.create(env.id, null))
      return env
    }

    private constructor () {
      this.id = 0
    }

    public callInNewScope<Scope extends HandleScope, Args extends any[], ReturnValue = any> (
      ScopeConstructor: { create: (env: napi_env, parent: IHandleScope | null) => Scope },
      fn: (scope: Scope, ...args: Args) => ReturnValue,
      ...args: Args
    ): ReturnValue {
      const scope = ScopeConstructor.create(this.id, this.getCurrentScope() ?? null)
      this.scopeList.push(scope)
      let ret: ReturnValue
      try {
        ret = fn(scope, ...args)
      } catch (err) {
        this.tryCatch.setError(err)
      }
      scope.dispose()
      this.scopeList.pop()
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
  }

  class EnvStore extends Store<Env> {
    public constructor () {
      super()
    }
  }

  export const envStore = new EnvStore()

  export function initErrorMemory (): void {
    if (!errorMessagesPtr) {
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

    HEAP32[(envObject.napiExtendedErrorInfoPtr >> 2) + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[(envObject.napiExtendedErrorInfoPtr >> 2) + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[(envObject.napiExtendedErrorInfoPtr >> 2) + 3] = envObject.napiExtendedErrorInfo.error_code
    return error_code
  }

  export function napi_clear_last_error (env: napi_env): napi_status {
    const envObject = envStore.get(env)!
    envObject.napiExtendedErrorInfo.error_code = napi_status.napi_ok
    envObject.napiExtendedErrorInfo.engine_error_code = 0
    envObject.napiExtendedErrorInfo.engine_reserved = 0

    HEAP32[(envObject.napiExtendedErrorInfoPtr >> 2) + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[(envObject.napiExtendedErrorInfoPtr >> 2) + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[(envObject.napiExtendedErrorInfoPtr >> 2) + 3] = envObject.napiExtendedErrorInfo.error_code
    return napi_status.napi_ok
  }

  export function checkEnv (env: napi_env): boolean {
    return (env !== NULL) && envStore.has(env)
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
