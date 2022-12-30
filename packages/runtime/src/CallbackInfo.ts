import { type IReusableStoreValue, ReusableStackStore } from './Store'

/** @internal */
export class CallbackInfo implements IReusableStoreValue {
  public id!: number
  public _this!: any
  public _data!: void_p
  public _args!: ArrayLike<any>
  public _newTarget!: Function | undefined

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
    _args: ArrayLike<any>,
    _newTarget: Function | undefined
  ): CallbackInfo {
    return CallbackInfo._stack.push(_this, _data, _args, _newTarget)
  }

  public constructor (
    _this: any,
    _data: void_p,
    _args: ArrayLike<any>,
    _newTarget: Function | undefined
  ) {
    this.init(_this, _data, _args, _newTarget)
  }

  public init (
    _this: any,
    _data: void_p,
    _args: ArrayLike<any>,
    _newTarget: Function | undefined
  ): void {
    this.id = 0
    this._this = _this
    this._data = _data
    this._args = _args
    this._newTarget = _newTarget
  }

  public dispose (): void {
    this.init(undefined, 0, undefined!, undefined)
  }
}
