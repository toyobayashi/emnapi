import { EnvStore } from './EnvStore'
import { ScopeStore } from './ScopeStore'
import { RefStore } from './RefStore'
import { DeferredStore } from './DeferredStore'
import { HandleStore } from './Handle'
import type { Handle } from './Handle'
import type { HandleScope } from './HandleScope'
import type { Env } from './env'
import { _global } from './util'
import { CallbackInfoStack } from './CallbackInfo'

/** @internal */
export class Context {
  public envStore: EnvStore
  public scopeStore: ScopeStore
  public refStore: RefStore
  public deferredStore: DeferredStore
  public handleStore: HandleStore
  public cbinfoStack: CallbackInfoStack

  constructor () {
    this.envStore = new EnvStore()
    this.scopeStore = new ScopeStore()
    this.refStore = new RefStore()
    this.deferredStore = new DeferredStore()
    this.handleStore = new HandleStore()
    this.cbinfoStack = new CallbackInfoStack()
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
