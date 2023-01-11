import type { Env } from './env'
import { HandleStore } from './Handle'
import { HandleScope } from './HandleScope'

export class ScopeStore {
  private readonly _rootScope: HandleScope
  public currentScope: HandleScope

  constructor () {
    this._rootScope = new HandleScope(null!, 0, null, 1, HandleStore.MIN_ID)
    this.currentScope = this._rootScope
  }

  get (id: number): HandleScope | undefined {
    id = Number(id)
    let scope = this.currentScope
    while (scope !== this._rootScope) {
      if (scope.id === id) {
        return scope
      }
      scope = scope.parent!
    }
    return undefined
  }

  openScope (envObject: Env): HandleScope {
    const currentScope = this.currentScope
    let scope = currentScope.child

    if (scope !== null) {
      scope.start = scope.end = currentScope.end
      scope._escapeCalled = false
    } else {
      scope = new HandleScope(envObject.ctx.handleStore, currentScope.id + 1, currentScope, currentScope.end)
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
    let scope: HandleScope | null = this.currentScope
    while (scope !== null) {
      scope.handleStore = null!
      scope.id = 0
      scope.parent = null
      scope.start = HandleStore.MIN_ID
      scope.end = HandleStore.MIN_ID
      scope._escapeCalled = false
      const child: HandleScope | null = scope.child
      scope.child = null
      scope = child
    }
    this.currentScope = null!
  }
}
