import type { Env } from './env'
import { Store } from './Store'

export class EnvStore extends Store<Env> {
  public constructor () {
    super(4)
  }
}
