import type { Env } from './env'
import { HandleScope } from './HandleScope'
import { ReusableStackStore } from './Store'

export class ScopeStore extends ReusableStackStore<typeof HandleScope> {
  public currentScope: HandleScope | null

  constructor () {
    super(HandleScope)
    this.currentScope = null
  }

  openScope (envObject: Env): HandleScope {
    const scope = this._values[this._next] as HandleScope
    if (scope) {
      scope.init(envObject.ctx, this.currentScope)
      scope.id = this._next
      this.currentScope = scope
      this._next++
    } else {
      this.currentScope = this.push(envObject.ctx, this.currentScope)
    }

    envObject.openHandleScopes++
    return this.currentScope
  }

  closeScope (envObject: Env): void {
    if (envObject.openHandleScopes === 0) return
    const scope = this.currentScope!
    this.currentScope = scope.parent
    scope.dispose()
    this._next--
    envObject.openHandleScopes--
  }
}
