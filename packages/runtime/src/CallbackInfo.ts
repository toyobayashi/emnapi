import { type IStoreValue, ReusableStackStore } from './Store'

/** @internal */
export class CallbackInfo implements IStoreValue {
  public id: number

  private static readonly _stack = new ReusableStackStore(CallbackInfo)

  public static get (id: number): CallbackInfo | undefined {
    return CallbackInfo._stack.get(id)
  }

  public static pop (): void {
    CallbackInfo._stack.pop()
  }

  public static push (
    _this: any,
    _data: void_p,
    _args: any[],
    _newTarget: Function | undefined
  ): CallbackInfo {
    return CallbackInfo._stack.push(_this, _data, _args, _newTarget)
  }

  public constructor (
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
  }
}
