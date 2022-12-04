import { EnvStore } from './EnvStore'
import { ScopeStore } from './ScopeStore'
import { RefStore } from './RefStore'
import { DeferredStore } from './DeferredStore'
import { CallbackInfoStore } from './CallbackInfoStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import { HandleScope } from './HandleScope'
import type { IHandleScope } from './HandleScope'
import type { Env } from './env'

/** @internal */
export class Context {
  public envStore: EnvStore
  public scopeStore: ScopeStore
  public refStore: RefStore
  public deferredStore: DeferredStore
  public cbInfoStore: CallbackInfoStore
  public handleStore: HandleStore
  private readonly _rootScope: HandleScope
  public currentScope: IHandleScope | null

  constructor () {
    this.envStore = new EnvStore()
    this.scopeStore = new ScopeStore()
    this.refStore = new RefStore()
    this.deferredStore = new DeferredStore()
    this.cbInfoStore = new CallbackInfoStore()
    this.handleStore = new HandleStore()

    this._rootScope = HandleScope.create(this, null)
    this.currentScope = null
  }

  /** @internal */
  getCurrentScope (): IHandleScope | null {
    return this.currentScope
  }

  /** @internal */
  addToCurrentScope<V> (envObject: Env, value: V): Handle<V> {
    return this.currentScope!.add(envObject, value)
  }

  /** @internal */
  openScope<Scope extends HandleScope> (envObject: Env, ScopeConstructor = HandleScope): Scope {
    if (this.currentScope) {
      const scope = ScopeConstructor.create(this, this.currentScope)
      this.currentScope.child = scope
      this.currentScope = scope
    } else {
      this.currentScope = this._rootScope
    }

    envObject.openHandleScopes++
    return this.currentScope as Scope
  }

  /** @internal */
  closeScope (envObject: Env, scope: IHandleScope): void {
    if (scope === this.currentScope) {
      this.currentScope = scope.parent
    }
    if (scope.parent) {
      scope.parent.child = scope.child
    }
    if (scope.child) {
      scope.child.parent = scope.parent
    }
    if (scope === this._rootScope) {
      scope.clearHandles()
      scope.child = null
    } else {
      scope.dispose()
    }
    envObject.openHandleScopes--
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
}

/** @public */
export function createContext (): Context {
  return new Context()
}
