import type { Deferred } from './Deferred'
import { Store } from './Store'

export class DeferredStore extends Store<Deferred> {
  public constructor () {
    super(8)
  }

  public canDispose (): boolean {
    for (let i = 1; i < this._values.length; ++i) {
      const deferred = this._values[i]
      if (deferred !== undefined) {
        return false
      }
    }
    return true
  }
}
