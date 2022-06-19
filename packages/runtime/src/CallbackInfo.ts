import { cbInfoStore } from './CallbackInfoStore'
import type { Env } from './env'
import type { IStoreValue } from './Store'

export class CallbackInfo implements IStoreValue {
  public id: number
  public _isConstructCall: boolean

  public static create (
    envObject: Env,
    _this: any,
    _data: void_p,
    _length: number,
    _args: any[],
    _newTarget: Function | undefined
  ): CallbackInfo {
    const cbInfo = new CallbackInfo(envObject, _this, _data, _length, _args, _newTarget)
    cbInfoStore.add(cbInfo)
    return cbInfo
  }

  private constructor (
    public envObject: Env,
    public _this: any,
    public _data: void_p,
    public _length: number,
    public _args: any[],
    public _newTarget: Function | undefined
  ) {
    this.id = 0
    this._isConstructCall = Boolean(_newTarget)
  }

  public dispose (): void {
    cbInfoStore.remove(this.id)
    this.id = 0
    this._this = undefined
    this._data = 0
    this._length = 0
    this._args = undefined!
    this._newTarget = undefined
    this._isConstructCall = false
  }
}
