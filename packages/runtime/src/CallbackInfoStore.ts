import type { CallbackInfo } from './index'
import { Store } from './Store'

export class CallbackInfoStore extends Store<CallbackInfo> {
  public constructor () {
    super(16)
  }
}

export const cbInfoStore = new CallbackInfoStore()
