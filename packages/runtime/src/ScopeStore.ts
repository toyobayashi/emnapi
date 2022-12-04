import type { IHandleScope } from './HandleScope'
import { Store } from './Store'

/** @internal */
export class ScopeStore extends Store<IHandleScope> {
  public constructor () {
    super(8)
  }
}
