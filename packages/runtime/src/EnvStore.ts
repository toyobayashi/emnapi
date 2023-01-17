import type { Env } from './env'
import { Store } from './Store'

export class EnvStore extends Store<Env> {
  public constructor () {
    super(2)
  }

  canDispose (): boolean {
    for (let i = 1; i < this._values.length; ++i) {
      const envObject = this._values[i]
      if (envObject !== undefined && envObject.refs > 1) {
        return false
      }
    }
    return true
  }
}
