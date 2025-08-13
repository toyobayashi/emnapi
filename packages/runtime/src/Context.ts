import { ScopeStore } from './ScopeStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import type { HandleScope } from './HandleScope'
import { Env, newEnv } from './env'
import {
  _global,
  supportReflect,
  supportFinalizer,
  supportWeakSymbol,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  _setImmediate,
  _Buffer,
  _MessageChannel,
  version,
  NODE_API_SUPPORTED_VERSION_MAX,
  NAPI_VERSION_EXPERIMENTAL,
  NODE_API_DEFAULT_MODULE_API_VERSION
} from './util'
import { NotSupportWeakRefError, NotSupportBufferError } from './errors'
import { Reference, ReferenceWithData, ReferenceWithFinalizer, type ReferenceOwnership } from './Reference'
import { type IDeferrdValue, Deferred } from './Deferred'
import { Store } from './Store'
import { TrackedFinalizer } from './TrackedFinalizer'

export type CleanupHookCallbackFunction = number | ((arg: number) => void)

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

  constructor () {
    this.refHandle = new _MessageChannel!().port1 as unknown as import('worker_threads').MessagePort
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

export class Context {
  private _isStopping = false
  private _canCallIntoJs = true
  private _suppressDestroy = false

  public envStore = new Store<Env>()
  public scopeStore = new ScopeStore()
  public refStore = new Store<Reference>()
  public deferredStore = new Store<Deferred>()
  public handleStore = new HandleStore()
  private readonly refCounter?: NodejsWaitingRequestCounter
  private readonly cleanupQueue: CleanupQueue

  public feature = {
    supportReflect,
    supportFinalizer,
    supportWeakSymbol,
    supportBigInt,
    supportNewFunction,
    canSetFunctionName,
    setImmediate: _setImmediate,
    Buffer: _Buffer,
    MessageChannel: _MessageChannel
  }

  public constructor () {
    this.cleanupQueue = new CleanupQueue()
    if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
      this.refCounter = new NodejsWaitingRequestCounter()
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getRuntimeVersions () {
    return {
      version,
      NODE_API_SUPPORTED_VERSION_MAX,
      NAPI_VERSION_EXPERIMENTAL,
      NODE_API_DEFAULT_MODULE_API_VERSION
    }
  }

  createNotSupportWeakRefError (api: string, message: string): NotSupportWeakRefError {
    return new NotSupportWeakRefError(api, message)
  }

  createNotSupportBufferError (api: string, message: string): NotSupportBufferError {
    return new NotSupportBufferError(api, message)
  }

  public createReference (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: ReferenceOwnership
  ): Reference {
    return Reference.create(
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
      envObject,
      handle_id,
      initialRefcount,
      ownership,
      finalize_callback,
      finalize_data,
      finalize_hint
    )
  }

  createDeferred<T = any> (value: IDeferrdValue<T>): Deferred<T> {
    return Deferred.create(this, value)
  }

  createEnv (
    filename: string,
    moduleApiVersion: number,
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void,
    abort: (msg?: string) => never,
    nodeBinding?: any
  ): Env {
    return newEnv(this, filename, moduleApiVersion, makeDynCall_vppp, makeDynCall_vp, abort, nodeBinding)
  }

  createTrackedFinalizer (
    envObject: Env,
    finalize_callback: napi_finalize,
    finalize_data: void_p,
    finalize_hint: void_p
  ): TrackedFinalizer {
    return TrackedFinalizer.create(envObject, finalize_callback, finalize_data, finalize_hint)
  }

  getCurrentScope (): HandleScope | null {
    return this.scopeStore.currentScope
  }

  addToCurrentScope<V> (value: V): Handle<V> {
    return this.scopeStore.currentScope.add(value)
  }

  openScope (envObject?: Env): HandleScope {
    const scope = this.scopeStore.openScope(this.handleStore)
    if (envObject) envObject.openHandleScopes++
    return scope
  }

  closeScope (envObject?: Env, _scope?: HandleScope): void {
    if (envObject && envObject.openHandleScopes === 0) return
    this.scopeStore.closeScope()
    if (envObject) envObject.openHandleScopes--
  }

  ensureHandle<S> (value: S): Handle<S> {
    switch (value as any) {
      case undefined: return HandleStore.UNDEFINED as any
      case null: return HandleStore.NULL as any
      case true: return HandleStore.TRUE as any
      case false: return HandleStore.FALSE as any
      case _global: return HandleStore.GLOBAL as any
      default: break
    }

    return this.addToCurrentScope(value)
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
