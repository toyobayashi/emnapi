import type { CallbackInfo } from './CallbackInfo'
import { Store } from './Store'

/** @internal */
export class CallbackInfoStore extends Store<CallbackInfo> {
  public constructor () {
    super(16)
  }
}
