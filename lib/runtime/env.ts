// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export const NULL: 0 = 0

  export let errorMessagesPtr: char_p[]

  export const INT64_RANGE_POSITIVE = Math.pow(2, 63)
  export const INT64_RANGE_NEGATIVE = -Math.pow(2, 63)

  class TryCatch {
    private _exception: any = undefined
    private _caught: boolean = false
    public hasCaught (): boolean {
      return this._caught
    }

    public exception (): any {
      return this._exception
    }

    public setError (err: any): void {
      this._exception = err
      this._caught = true
    }

    public reset (): void {
      this._exception = undefined
      this._caught = false
    }

    public extractException (): any {
      const e = this._exception
      this.reset()
      return e
    }
  }

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
    if (typeof (_global as any).gc === 'function') {
      (_global as any).gc()
    }
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
        env.napiExtendedErrorInfoPtr = call_malloc(16)
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

  export function createFunction<F extends (...args: any[]) => any> (env: napi_env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p): F {
    const envObject = envStore.get(env)!
    const f = (() => function (this: any): any {
      'use strict'
      const callbackInfo = {
        _this: this,
        _data: data,
        _length: arguments.length,
        _args: Array.prototype.slice.call(arguments),
        _newTarget: new.target,
        _isConstructCall: !!new.target
      }
      const ret = envObject.callInNewHandleScope((scope) => {
        const cbinfoHandle = scope.add(callbackInfo)
        const napiValue = call_iii(cb, env, cbinfoHandle.id)
        return (!napiValue) ? undefined : envObject.handleStore.get(napiValue)!.value
      })
      if (envObject.tryCatch.hasCaught()) {
        const err = envObject.tryCatch.extractException()!
        throw err
      }
      return ret
    })()

    if (canSetFunctionName) {
      Object.defineProperty(f, 'name', {
        value: (utf8name === NULL || length === 0) ? '' : (length === -1 ? UTF8ToString(utf8name) : UTF8ToString(utf8name, length))
      })
    }

    return f as F
  }

  export function createTypedArray (env: napi_env, Type: { new (...args: any[]): ArrayBufferView; name?: string }, size_of_element: number, buffer: ArrayBuffer, byte_offset: size_t, length: size_t, callback: (out: ArrayBufferView) => napi_status): napi_status {
    byte_offset = byte_offset >>> 0
    length = length >>> 0
    const envObject = envStore.get(env)!
    if (size_of_element > 1) {
      if ((byte_offset) % (size_of_element) !== 0) {
        const err: RangeError & { code?: string } = new RangeError(`start offset of ${Type.name ?? ''} should be a multiple of ${size_of_element}`)
        err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_ALIGNMENT'
        envObject.tryCatch.setError(err)
        return napi_set_last_error(env, napi_status.napi_generic_failure)
      }
    }
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
    if (((length * size_of_element) + byte_offset) <= buffer.byteLength) {
      const err: RangeError & { code?: string } = new RangeError('Invalid typed array length')
      err.code = 'ERR_NAPI_INVALID_TYPEDARRAY_LENGTH'
      envObject.tryCatch.setError(err)
      return napi_set_last_error(env, napi_status.napi_generic_failure)
    }
    const out = new Type(buffer, byte_offset, length)
    return callback(out)
  }

  export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
  export const supportBigInt = typeof BigInt !== 'undefined'

  export enum WrapType {
    retrievable,
    anonymous
  }

  export function wrap (type: WrapType, env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
    return preamble(env, (envObject) => {
      return checkArgs(env, [js_object], () => {
        const value = envObject.handleStore.get(js_object)!
        if (!(value.isObject() || value.isFunction())) {
          return napi_set_last_error(env, napi_status.napi_invalid_arg)
        }

        if (type === WrapType.retrievable) {
          if (value.wrapped !== 0) {
            return napi_set_last_error(env, napi_status.napi_invalid_arg)
          }
        } else if (type === WrapType.anonymous) {
          if (finalize_cb === NULL) return napi_set_last_error(env, napi_status.napi_invalid_arg)
        }

        let reference: Reference
        if (result !== NULL) {
          if (finalize_cb === NULL) return napi_set_last_error(env, napi_status.napi_invalid_arg)
          reference = Reference.create(env, value.id, 0, false, finalize_cb, native_object, finalize_hint)
          HEAP32[result >> 2] = reference.id
        } else {
          reference = Reference.create(env, value.id, 0, true, finalize_cb, native_object, finalize_cb === NULL ? NULL : finalize_hint)
        }

        if (type === WrapType.retrievable) {
          // const external = ExternalHandle.createExternal(env, reference.id)
          // envObject.getCurrentScope().addNoCopy(external)
          // value.wrapped = external.id
          value.wrapped = reference.id
        }
        return getReturnStatus(env)
      })
    })
  }

  export enum UnwrapAction {
    KeepWrap,
    RemoveWrap
  }

  export function unwrap (env: napi_env, js_object: napi_value, result: void_pp, action: UnwrapAction): napi_status {
    return preamble(env, (envObject) => {
      return checkArgs(env, [js_object], () => {
        if (action === UnwrapAction.KeepWrap) {
          if (result === NULL) return napi_set_last_error(env, napi_status.napi_invalid_arg)
        }
        const value = envObject.handleStore.get(js_object)!
        if (!(value.isObject() || value.isFunction())) {
          return napi_set_last_error(env, napi_status.napi_invalid_arg)
        }
        const referenceId = value.wrapped
        const ref = envObject.refStore.get(referenceId)
        if (!ref) return napi_set_last_error(env, napi_status.napi_invalid_arg)
        if (result !== NULL) {
          HEAP32[result >> 2] = ref.data()
        }
        if (action === UnwrapAction.RemoveWrap) {
          value.wrapped = 0
          Reference.doDelete(ref)
        }
        return getReturnStatus(env)
      })
    })
  }

  const integerIndiceRegex = /^(0|[1-9][0-9]*)$/

  function addName (ret: Array<string | number | symbol>, name: string | number | symbol, key_filter: number, conversion_mode: napi_key_conversion): void {
    if (ret.indexOf(name) !== -1) return
    if (conversion_mode === napi_key_conversion.napi_key_keep_numbers) {
      ret.push(name)
    } else if (conversion_mode === napi_key_conversion.napi_key_numbers_to_strings) {
      const realName = typeof name === 'number' ? String(name) : name
      if (typeof realName === 'string') {
        if (!(key_filter & napi_key_filter.napi_key_skip_strings)) {
          ret.push(realName)
        }
      } else {
        ret.push(realName)
      }
    }
  }

  export function getPropertyNames (obj: object, collection_mode: napi_key_collection_mode, key_filter: number, conversion_mode: napi_key_conversion): Array<string | symbol | number> {
    const props: Array<{ name: string | number | symbol; desc: PropertyDescriptor; own: boolean }> = []
    let names: string[]
    let symbols: symbol[]
    let i: number
    let own: boolean = true
    do {
      names = Object.getOwnPropertyNames(obj)
      symbols = Object.getOwnPropertySymbols(obj)
      for (i = 0; i < names.length; i++) {
        props.push({
          name: integerIndiceRegex.test(names[i]) ? Number(names[i]) : names[i],
          desc: Object.getOwnPropertyDescriptor(obj, names[i])!,
          own: own
        })
      }
      for (i = 0; i < symbols.length; i++) {
        props.push({
          name: symbols[i],
          desc: Object.getOwnPropertyDescriptor(obj, symbols[i])!,
          own: own
        })
      }
      if (collection_mode === napi_key_collection_mode.napi_key_own_only) {
        break
      }
      obj = Object.getPrototypeOf(obj)
      own = false
    } while (obj)
    const ret: Array<string | number | symbol> = []
    for (i = 0; i < props.length; i++) {
      const name = props[i].name
      if (key_filter === napi_key_filter.napi_key_all_properties) {
        addName(ret, name, key_filter, conversion_mode)
      } else {
        if (key_filter & napi_key_filter.napi_key_skip_strings) {
          if (typeof name === 'string') continue
        }
        if (key_filter & napi_key_filter.napi_key_skip_symbols) {
          if (typeof name === 'symbol') continue
        }
        if (key_filter & napi_key_filter.napi_key_writable) {
          if (props[i].desc.writable) addName(ret, name, key_filter, conversion_mode)
          continue
        }
        if (key_filter & napi_key_filter.napi_key_enumerable) {
          if (props[i].desc.enumerable) addName(ret, name, key_filter, conversion_mode)
          continue
        }
        if (key_filter & napi_key_filter.napi_key_configurable) {
          if (props[i].desc.configurable) addName(ret, name, key_filter, conversion_mode)
          continue
        }
        addName(ret, name, key_filter, conversion_mode)
      }
    }
    return ret
  }

  export function defineProperty (env: napi_env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
    const envObject = envStore.get(env)!
    if (getter !== NULL || setter !== NULL) {
      let localGetter: () => any
      let localSetter: (v: any) => void
      if (getter !== NULL) {
        localGetter = createFunction(env, NULL, 0, getter, data)
      }
      if (setter !== NULL) {
        localSetter = createFunction(env, NULL, 0, setter, data)
      }
      const desc: PropertyDescriptor = {
        configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
        enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
        get: localGetter!,
        set: localSetter!
      }
      Object.defineProperty(obj, propertyName, desc)
    } else if (method !== NULL) {
      const localMethod = createFunction(env, NULL, 0, method, data)
      const desc: PropertyDescriptor = {
        configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
        enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
        writable: (attributes & napi_property_attributes.napi_writable) !== 0,
        value: localMethod
      }
      Object.defineProperty(obj, propertyName, desc)
    } else {
      const desc: PropertyDescriptor = {
        configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
        enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
        writable: (attributes & napi_property_attributes.napi_writable) !== 0,
        value: envObject.handleStore.get(value)!.value
      }
      Object.defineProperty(obj, propertyName, desc)
    }
  }
}
