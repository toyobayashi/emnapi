import type { Env } from './index'
import { Store } from './Store'

export class EnvStore extends Store<Env> {
  public constructor () {
    super(4)
  }
}

export const envStore = new EnvStore()
