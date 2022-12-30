import type { Env } from './env'
import { HandleStore } from './Handle'
import { HandleScope } from './HandleScope'
import { ReusableStackStore } from './Store'

export class ScopeStore extends ReusableStackStore<typeof HandleScope> {
  public currentScope: HandleScope | null

  constructor () {
    super(HandleScope)
    this.currentScope = null
  }

  openScope (envObject: Env): HandleScope {
    let scope: HandleScope
    const start = envObject.openHandleScopes === 0 ? HandleStore.MIN_ID : this.currentScope!.end
    if (this._next < this._values.length) {
      scope = this._values[this._next] as HandleScope
      scope.init(envObject.ctx.handleStore, this.currentScope, start)
      scope.id = this._next
      this.currentScope = scope
      this._next++
    } else {
      scope = this.push(envObject.ctx.handleStore, this.currentScope, start)
      this.currentScope = scope
    }

    envObject.openHandleScopes++
    return scope
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
