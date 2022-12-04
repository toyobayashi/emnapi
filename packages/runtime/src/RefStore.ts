import type { Reference } from './Reference'
import { Store } from './Store'

/** @internal */
export class RefStore extends Store<Reference> {
  public constructor () {
    super(8)
  }
}
