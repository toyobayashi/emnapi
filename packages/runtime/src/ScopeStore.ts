import type { IHandleScope } from './index'
import { Store } from './Store'

export class ScopeStore extends Store<IHandleScope> {
  public constructor () {
    super(8)
  }
}

export const scopeStore = new ScopeStore()
