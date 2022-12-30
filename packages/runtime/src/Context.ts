import { EnvStore } from './EnvStore'
import { ScopeStore } from './ScopeStore'
import { RefStore } from './RefStore'
import { DeferredStore } from './DeferredStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import type { HandleScope } from './HandleScope'
import type { Env } from './env'
import { _global } from './util'

/** @internal */
export class Context {
  public envStore: EnvStore
  public scopeStore: ScopeStore
  public refStore: RefStore
  public deferredStore: DeferredStore
  public handleStore: HandleStore

  constructor () {
    this.envStore = new EnvStore()
    this.scopeStore = new ScopeStore()
    this.refStore = new RefStore()
    this.deferredStore = new DeferredStore()
    this.handleStore = new HandleStore()
  }

  /** @internal */
  getCurrentScope (): HandleScope | null {
    return this.scopeStore.currentScope
  }

  /** @internal */
  addToCurrentScope<V> (value: V): Handle<V> {
    return this.scopeStore.currentScope!.add(value)
  }

  /** @internal */
  openScope (envObject: Env): HandleScope {
    return this.scopeStore.openScope(envObject)
  }

  /** @internal */
  closeScope (envObject: Env, _scope: HandleScope): void {
    return this.scopeStore.closeScope(envObject)
  }

  /** @internal */
  checkEnv (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    if (!env) return napi_status.napi_invalid_arg
    const envObject = this.envStore.get(env)
    if (envObject === undefined) return napi_status.napi_invalid_arg
    return fn(envObject)
  }

  /** @internal */
  checkArgs (envObject: Env, args: Ptr[], fn: () => napi_status): napi_status {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (!arg) {
        return envObject.setLastError(napi_status.napi_invalid_arg)
      }
    }
    return fn()
  }

  /** @internal */
  preamble (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    return this.checkEnv(env, (envObject) => {
      if (envObject.tryCatch.hasCaught()) return envObject.setLastError(napi_status.napi_pending_exception)
      envObject.clearLastError()
      try {
        return fn(envObject)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return envObject.setLastError(napi_status.napi_pending_exception)
      }
    })
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

    const currentScope = this.scopeStore.currentScope!
    return currentScope.add(value)
  }
}

/** @public */
export function createContext (): Context {
  return new Context()
}
