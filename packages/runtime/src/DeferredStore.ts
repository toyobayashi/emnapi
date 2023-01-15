import type { Deferred } from './Deferred'
import { Store } from './Store'

export class DeferredStore extends Store<Deferred> {
  public constructor () {
    super(8)
  }
}
