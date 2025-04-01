import { HandleStore } from './Handle'
import { HandleScope } from './HandleScope'
import { BaseArrayStore } from './Store'

export class ScopeStore extends BaseArrayStore<HandleScope> {
  private readonly _rootScope: HandleScope
  public currentScope: HandleScope

  public constructor () {
    super()
    this._rootScope = new HandleScope(null!, null!, 1, HandleStore.MIN_ID)
    this.currentScope = this._rootScope
  }

  public openScope (handleStore: HandleStore): HandleScope {
    const currentScope = this.currentScope
    let scope = currentScope.child
    if (scope) {
      scope.reuse(currentScope)
    } else {
      scope = new HandleScope(currentScope, handleStore)
      const id = currentScope.id as number + 1
      scope.id = id
      this._values[id as number] = scope
    }
    this.currentScope = scope
    return scope
  }

  public closeScope (): void {
    const scope = this.currentScope
    this.currentScope = scope.parent!
    scope.dispose()
  }
}
