import type { Reference } from './Reference'
import { Store } from './Store'

export class RefStore extends Store<Reference> {
  public constructor () {
    super(8)
  }
}
