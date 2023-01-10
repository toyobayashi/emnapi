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
export class Context {
  public envStore = new EnvStore()
  public scopeStore = new ScopeStore()
  public refStore = new RefStore()
  public deferredStore = new DeferredStore()
  public handleStore = new HandleStore()
  public cbinfoStack = new CallbackInfoStack()
  public feature = {
    supportReflect,
    supportFinalizer,
    supportBigInt,
    supportNewFunction,
    canSetFunctionName,
    setImmediate: _setImmediate,
    Buffer
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

  createEnv (makeDynCall_vppp: (cb: Ptr) => (a: Ptr, b: Ptr, c: Ptr) => void): Env {
    return Env.create(this, makeDynCall_vppp)
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
}

/** @public */
export function createContext (): Context {
  return new Context()
}
