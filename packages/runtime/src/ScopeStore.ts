import type { Env } from './env'
import { HandleStore } from './Handle'
import { HandleScope } from './HandleScope'

export class ScopeStore {
  private readonly _rootScope: HandleScope
  public currentScope: HandleScope
  private readonly _values: [undefined, ...HandleScope[]]

  constructor () {
    this._rootScope = new HandleScope(null!, 0, null, 1, HandleStore.MIN_ID)
    this.currentScope = this._rootScope
    this._values = [undefined]
  }

  get (id: number): HandleScope | undefined {
    return this._values[id]
  }

  openScope (envObject: Env): HandleScope {
    const currentScope = this.currentScope
    let scope = currentScope.child

    if (scope !== null) {
      scope.start = scope.end = currentScope.end
    } else {
      const id = currentScope.id + 1
      scope = new HandleScope(envObject.ctx.handleStore, id, currentScope, currentScope.end)
      this._values[id] = scope
    }
    this.currentScope = scope

    envObject.openHandleScopes++
    return scope
  }

  closeScope (envObject: Env): void {
    if (envObject.openHandleScopes === 0) return
    const scope = this.currentScope
    this.currentScope = scope.parent!
    scope.dispose()
    envObject.openHandleScopes--
  }

  dispose (): void {
    this.currentScope = this._rootScope
    this._values.length = 1
  }
}
