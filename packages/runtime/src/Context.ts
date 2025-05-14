import { ScopeStore } from './ScopeStore'
import { HandleStore } from './Handle'
import type { HandleScope, ICallbackInfo } from './HandleScope'
import { Env, NodeEnv } from './env'
import {
  version,
  NODE_API_SUPPORTED_VERSION_MAX,
  NAPI_VERSION_EXPERIMENTAL,
  NODE_API_DEFAULT_MODULE_API_VERSION,
  detectFeatures,
  Features
} from './util'
import { NotSupportWeakRefError, NotSupportBufferError } from './errors'
import { Reference, ReferenceWithData, ReferenceWithFinalizer, type ReferenceOwnership } from './Reference'
import { type IDeferrdValue, Deferred } from './Deferred'
import { ArrayStore } from './Store'
import { TrackedFinalizer } from './TrackedFinalizer'
import { External, isExternal, getExternalValue } from './External'
import { FunctionTemplate } from './FunctionTemplate'

export type CleanupHookCallbackFunction = number | ((arg: number) => void)

const callbackWrapper = (envObject: Env, callback: (env: Env) => napi_value) => {
  const napiValue = envObject.callIntoModule(callback)
  return (!napiValue) ? undefined : envObject.ctx.jsValueFromNapiValue(napiValue)!
}

const withScope = (envObject: Env, thiz: any, args: any[], data: number | bigint, getFunction: () => Function, wrapper: (envObject: Env, callback: (env: Env) => napi_value) => any, callback: (env: Env) => napi_value) => {
  const scope = envObject.ctx.openScope(envObject)
  const callbackInfo = scope.callbackInfo
  callbackInfo.data = data
  callbackInfo.args = args
  callbackInfo.thiz = thiz
  callbackInfo.fn = getFunction
  try {
    return wrapper(envObject, callback)
  } finally {
    callbackInfo.data = 0
    callbackInfo.args = undefined!
    callbackInfo.thiz = undefined
    callbackInfo.fn = undefined!
    envObject.ctx.closeScope(envObject, scope)
  }
}

class CleanupHookCallback {
  constructor (
    public envObject: Env,
    public fn: CleanupHookCallbackFunction,
    public arg: number,
    public order: number
  ) {}
}

class CleanupQueue {
  private readonly _cleanupHooks = [] as CleanupHookCallback[]
  private _cleanupHookCounter = 0

  public empty (): boolean {
    return this._cleanupHooks.length === 0
  }

  public add (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    if (this._cleanupHooks.filter((hook) => (hook.envObject === envObject && hook.fn === fn && hook.arg === arg)).length > 0) {
      throw new Error('Can not add same fn and arg twice')
    }
    this._cleanupHooks.push(new CleanupHookCallback(envObject, fn, arg, this._cleanupHookCounter++))
  }

  public remove (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    for (let i = 0; i < this._cleanupHooks.length; ++i) {
      const hook = this._cleanupHooks[i]
      if (hook.envObject === envObject && hook.fn === fn && hook.arg === arg) {
        this._cleanupHooks.splice(i, 1)
        return
      }
    }
  }

  public drain (): void {
    const hooks = this._cleanupHooks.slice()
    hooks.sort((a, b) => (b.order - a.order))
    for (let i = 0; i < hooks.length; ++i) {
      const cb = hooks[i]
      if (typeof cb.fn === 'number') {
        cb.envObject.makeDynCall_vp(cb.fn)(cb.arg)
      } else {
        cb.fn(cb.arg)
      }
      this._cleanupHooks.splice(this._cleanupHooks.indexOf(cb), 1)
    }
  }

  public dispose (): void {
    this._cleanupHooks.length = 0
    this._cleanupHookCounter = 0
  }
}

class NodejsWaitingRequestCounter {
  private readonly refHandle: { ref: () => void; unref: () => void }
  private count: number

  constructor (MessageChannel: typeof globalThis.MessageChannel) {
    this.refHandle = new MessageChannel().port1 as unknown as import('worker_threads').MessagePort
    this.count = 0
  }

  public increase (): void {
    if (this.count === 0) {
      if (this.refHandle.ref) {
        this.refHandle.ref()
      }
    }
    this.count++
  }

  public decrease (): void {
    if (this.count === 0) return
    if (this.count === 1) {
      if (this.refHandle.unref) {
        this.refHandle.unref()
      }
    }
    this.count--
  }
}

let _globalThis: typeof globalThis

export interface ContextOptions {
  features?: Partial<Features>
}

export class Context {
  private _isStopping = false
  private _canCallIntoJs = true
  private _suppressDestroy = false

  private envStore = new ArrayStore<Env>()
  private scopeStore = new ScopeStore()
  private refStore = new ArrayStore<Reference>()
  private deferredStore = new ArrayStore<Deferred>()
  private readonly refCounter?: NodejsWaitingRequestCounter
  private readonly cleanupQueue: CleanupQueue

  public readonly features: Features = detectFeatures()

  private handleStore: HandleStore

  public constructor (options?: ContextOptions) {
    this.features = detectFeatures(options?.features)
    this.handleStore = new HandleStore(this.features)
    _globalThis ??= this.features.getGlobalThis()
    this.cleanupQueue = new CleanupQueue()
    if (typeof process === 'object' && process !== null && typeof process.once === 'function' && this.features.MessageChannel) {
      this.refCounter = new NodejsWaitingRequestCounter(this.features.MessageChannel)
      process.once('beforeExit', () => {
        if (!this._suppressDestroy) {
          this.destroy()
        }
      })
    }
  }

  /**
   * Suppress the destroy on `beforeExit` event in Node.js.
   * Call this method if you want to keep the context and
   * all associated {@link Env | Env} alive,
   * this also means that cleanup hooks will not be called.
   * After call this method, you should call
   * {@link Context.destroy | `Context.prototype.destroy`} method manually.
   */
  public suppressDestroy (): void {
    this._suppressDestroy = true
  }

  public getRuntimeVersions () {
    return {
      version,
      NODE_API_SUPPORTED_VERSION_MAX,
      NAPI_VERSION_EXPERIMENTAL,
      NODE_API_DEFAULT_MODULE_API_VERSION
    }
  }

  public createNotSupportWeakRefError (api: string, message: string): NotSupportWeakRefError {
    return new NotSupportWeakRefError(api, message)
  }

  public createNotSupportBufferError (api: string, message: string): NotSupportBufferError {
    return new NotSupportBufferError(api, message)
  }

  public createReference (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ): Reference {
    return Reference.create(
      this.refStore,
      envObject,
      handle_id,
      initialRefcount,
      ownership
    )
  }

  public createReferenceWithData (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    data: void_p
  ): Reference {
    return ReferenceWithData.create(
      this.refStore,
      envObject,
      handle_id,
      initialRefcount,
      ownership,
      data
    )
  }

  public createReferenceWithFinalizer (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    return ReferenceWithFinalizer.create(
      this.refStore,
      envObject,
      handle_id,
      initialRefcount,
      ownership,
      finalize_callback,
      finalize_data,
      finalize_hint
    )
  }

  public createDeferred<T = any> (value: IDeferrdValue<T>): Deferred<T> {
    return new Deferred(this.deferredStore, value)
  }

  public createEnv (
    filename: string,
    moduleApiVersion: number,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void,
    abort: (msg?: string) => never,
    nodeBinding?: any
  ): Env {
    moduleApiVersion = typeof moduleApiVersion !== 'number' ? NODE_API_DEFAULT_MODULE_API_VERSION : moduleApiVersion
    // Validate module_api_version.
    if (moduleApiVersion < NODE_API_DEFAULT_MODULE_API_VERSION) {
      moduleApiVersion = NODE_API_DEFAULT_MODULE_API_VERSION
    } else if (moduleApiVersion > NODE_API_SUPPORTED_VERSION_MAX && moduleApiVersion !== NAPI_VERSION_EXPERIMENTAL) {
      const errorMessage = `${
        filename} requires Node-API version ${
          moduleApiVersion}, but this version of Node.js only supports version ${
            NODE_API_SUPPORTED_VERSION_MAX} add-ons.`
      throw new Error(errorMessage)
    }
    const env = new NodeEnv(
      this,
      this.envStore,
      filename,
      moduleApiVersion,
      makeDynCall_vppp,
      makeDynCall_vp,
      abort,
      nodeBinding
    )
    this.addCleanupHook(env, () => { env.unref() }, 0)
    return env
  }

  public createFunctionTemplate (
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr,
    v8FunctionCallback: Ptr,
    data: Ptr
  ) {
    const functionTemplate = new FunctionTemplate(
      this,
      callback,
      v8FunctionCallback,
      data
    )

    return functionTemplate
  }

  public createFunction (
    envObject: Env,
    napiCallback: (env: napi_env, info: napi_callback_info) => void_p,
    data: number | bigint,
    name: string,
    dynamicExecution: boolean
  ) {
    if (envObject.ctx !== this) {
      throw new Error(`The napi_env (${envObject.id}) is not created by this context`)
    }

    const callback = (envObject: Env) => {
      return napiCallback(envObject.id, envObject.ctx.getCurrentScope()!.id)
    }

    let _: Function

    // @ts-expect-error
    const staticFunctionWrapper = (withScope, envObject, data, callbackWrapper, callback) => {
      return function (this: any, ...args: any[]) {
        return withScope(envObject, this, args, data, _, callbackWrapper, callback)
      }
    }

    let functionWrapper: Function

    if (name && dynamicExecution && this.features.makeDynamicFunction) {
      try {
        functionWrapper = this.features.makeDynamicFunction('withScope', 'envObject', 'data', 'callbackWrapper', 'callback',
          'return function ' + name + '(...args){' +
            'return withScope(envObject,this,args,data,' + name + ',callbackWrapper,callback)' +
          '};'
        )
      } catch (_) {
        functionWrapper = staticFunctionWrapper
      }
    } else {
      functionWrapper = staticFunctionWrapper
    }

    _ = functionWrapper(withScope, envObject, data, callbackWrapper, callback)
    if (functionWrapper === staticFunctionWrapper && this.features.setFunctionName && name) {
      this.features.setFunctionName(_, name)
    }

    return _
  }

  public createTrackedFinalizer (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): TrackedFinalizer {
    return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  public createExternal (data: number | bigint): External {
    return new External(data)
  }

  public getExternalValue (external: External): number | bigint {
    return getExternalValue(external)
  }

  public getCurrentScope (): HandleScope | null {
    return this.scopeStore.currentScope
  }

  public openScope (envObject: Env): HandleScope {
    const scope = this.openScopeRaw()
    envObject.openHandleScopes++
    return scope
  }

  public openScopeRaw (): HandleScope {
    return this.scopeStore.openScope(this.handleStore)
  }

  public closeScope (envObject: Env, scope?: HandleScope): void {
    this.closeScopeRaw(scope)
    envObject.openHandleScopes--
  }

  public closeScopeRaw (_scope?: HandleScope): void {
    this.scopeStore.closeScope()
  }

  public getEnv (env: napi_env): Env | undefined {
    return this.envStore.deref(env)
  }

  public getRef (ref: napi_ref): Reference | undefined {
    return this.refStore.deref(ref)
  }

  public getHandleScope (scope: napi_handle_scope): HandleScope | undefined {
    return this.scopeStore.deref(scope)
  }

  public getCallbackInfo (info: napi_callback_info): ICallbackInfo {
    return this.scopeStore.deref(info)!.callbackInfo
  }

  public getDeferred<T = any> (deferred: napi_deferred): Deferred<T> | undefined {
    return this.deferredStore.deref(deferred)
  }

  public napiValueFromJsValue (value: unknown): number | bigint {
    return this.scopeStore.currentScope.add(value)
  }

  public jsValueFromNapiValue<T = any> (napiValue: number | bigint): T | undefined {
    return this.handleStore.deref(napiValue)
  }

  public isExternal (value: unknown): boolean {
    return isExternal(value)
  }

  public addCleanupHook (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    this.cleanupQueue.add(envObject, fn, arg)
  }

  public removeCleanupHook (envObject: Env, fn: CleanupHookCallbackFunction, arg: number): void {
    this.cleanupQueue.remove(envObject, fn, arg)
  }

  public runCleanup (): void {
    while (!this.cleanupQueue.empty()) {
      this.cleanupQueue.drain()
    }
  }

  public increaseWaitingRequestCounter (): void {
    this.refCounter?.increase()
  }

  public decreaseWaitingRequestCounter (): void {
    this.refCounter?.decrease()
  }

  public setCanCallIntoJs (value: boolean): void {
    this._canCallIntoJs = value
  }

  public setStopping (value: boolean): void {
    this._isStopping = value
  }

  public canCallIntoJs (): boolean {
    return this._canCallIntoJs && !this._isStopping
  }

  /**
   * Destroy the context and call cleanup hooks.
   * Associated {@link Env | Env} will be destroyed.
   */
  public destroy (): void {
    this.setStopping(true)
    this.setCanCallIntoJs(false)
    this.runCleanup()
  }
}

let defaultContext: Context

export function createContext (): Context {
  return new Context()
}

export function getDefaultContext (): Context {
  if (!defaultContext) {
    defaultContext = createContext()
  }
  return defaultContext
}
