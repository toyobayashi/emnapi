import type { IStoreValue } from './Store'

/** @internal */
export class CallbackInfo implements IStoreValue {
  public id: number

  private static readonly _stack: CallbackInfo[] = [undefined!]

  private static _next: number = 1

  public static get (id: number): CallbackInfo {
    return CallbackInfo._stack[id]
  }

  public static create (
    _this: any,
    _data: void_p,
    _args: any[],
    _newTarget: Function | undefined
  ): CallbackInfo {
    let cbInfo: CallbackInfo
    if (CallbackInfo._stack[CallbackInfo._next]) {
      cbInfo = CallbackInfo._stack[CallbackInfo._next]
      cbInfo._this = _this
      cbInfo._data = _data
      cbInfo._args = _args
      cbInfo._newTarget = _newTarget
    } else {
      cbInfo = new CallbackInfo(_this, _data, _args, _newTarget)
      CallbackInfo._stack.push(cbInfo)
    }
    cbInfo.id = CallbackInfo._next
    CallbackInfo._next++
    return cbInfo
  }

  private constructor (
    public _this: any,
    public _data: void_p,
    public _args: any[],
    public _newTarget: Function | undefined
  ) {
    this.id = 0
  }

  public dispose (): void {
    this.id = 0
    this._this = undefined
    this._data = 0
    this._args = undefined!
    this._newTarget = undefined
    CallbackInfo._next--
  }
}
