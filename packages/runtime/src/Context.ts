import { EnvStore } from './EnvStore'
import { ScopeStore } from './ScopeStore'
import { RefStore } from './RefStore'
import { DeferredStore } from './DeferredStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import type { HandleScope } from './HandleScope'
import { Env } from './env'
import {
  _global,
  supportReflect,
  supportFinalizer,
  supportBigInt,
  supportNewFunction,
  canSetFunctionName,
  _setImmediate,
  Buffer
} from './util'
import { CallbackInfoStack } from './CallbackInfo'
import { NotSupportWeakRefError, NotSupportBigIntError } from './errors'
import { Reference } from './Reference'
import type { Ownership } from './RefBase'
import { type IDeferrdValue, Deferred } from './Deferred'

/** @internal */
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
  private _cleanupHooks = [] as CleanupHookCallback[]
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
    while (this._cleanupHooks.length > 0) {
      const cb = this._cleanupHooks[this._cleanupHooks.length - 1]
      if (typeof cb.fn === 'number') {
        cb.envObject.makeDynCall_vp(cb.fn)(cb.arg)
      } else {
        cb.fn(cb.arg)
      }
      this._cleanupHooks.pop()
    }
  }

  public dispose (): void {
    this._cleanupHooks = null!
    this._cleanupHookCounter = 0
  }
}

/** @internal */
export class Context {
  public envStore = new EnvStore()
  public scopeStore = new ScopeStore()
  public refStore = new RefStore()
  public deferredStore = new DeferredStore()
  public handleStore = new HandleStore()
  public cbinfoStack = new CallbackInfoStack()
  private readonly cleanupQueue: CleanupQueue

  public feature = {
    supportReflect,
    supportFinalizer,
    supportBigInt,
    supportNewFunction,
    canSetFunctionName,
    setImmediate: _setImmediate,
    Buffer
  }

  public constructor () {
    this.cleanupQueue = new CleanupQueue()
    if (typeof process === 'object' && process !== null && typeof process.once === 'function') {
      process.once('beforeExit', () => {
        this.dispose()
      })
    }
  }

  createNotSupportWeakRefError (api: string, message: string): NotSupportWeakRefError {
    return new NotSupportWeakRefError(api, message)
  }

  createNotSupportBigIntError (api: string, message: string): NotSupportBigIntError {
    return new NotSupportBigIntError(api, message)
  }

  public createReference (
    envObject: Env,
    handle_id: napi_value,
    initialRefcount: uint32_t,
    ownership: Ownership,
    finalize_callback: napi_finalize = 0,
    finalize_data: void_p = 0,
    finalize_hint: void_p = 0
  ): Reference {
    return Reference.create(
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
    makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void,
    makeDynCall_vp: (cb: Ptr) => (a: Ptr) => void
  ): Env {
    return Env.create(this, makeDynCall_vppp, makeDynCall_vp)
  }

  /** @internal */
  getCurrentScope (): HandleScope | null {
    return this.scopeStore.currentScope
  }

  /** @internal */
  addToCurrentScope<V> (value: V): Handle<V> {
    return this.scopeStore.currentScope.add(value)
  }

  /** @internal */
  openScope (envObject: Env): HandleScope {
    return this.scopeStore.openScope(envObject)
  }

  /** @internal */
  closeScope (envObject: Env, _scope?: HandleScope): void {
    return this.scopeStore.closeScope(envObject)
  }

  /** @internal */
  ensureHandle<S> (value: S): Handle<S> {
    switch (value as any) {
      case undefined: return HandleStore.UNDEFINED as any
      case null: return HandleStore.NULL as any
      case true: return HandleStore.TRUE as any
      case false: return HandleStore.FALSE as any
      case _global: return HandleStore.GLOBAL as any
      default: break
    }

    const currentScope = this.scopeStore.currentScope
    return currentScope.add(value)
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

  dispose (): void {
    this.runCleanup()
    this.cleanupQueue.dispose()

    this.cbinfoStack.dispose()
    this.scopeStore.dispose()
    this.handleStore.dispose()
    this.deferredStore.dispose()
    this.refStore.dispose()
    // this.envStore.dispose()
    this.cbinfoStack = null!
    this.scopeStore = null!
    this.handleStore = null!
    this.deferredStore = null!
    this.refStore = null!
    // this.envStore = null!
  }
}

/** @public */
export function createContext (): Context {
  return new Context()
}
