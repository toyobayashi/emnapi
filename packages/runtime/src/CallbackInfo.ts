import type { Env } from './env'

/** @internal */
export class CallbackInfo {
  public static current: CallbackInfo | null = null

  public static pop (): void {
    const current = CallbackInfo.current
    if (current === null) return
    CallbackInfo.current = current.parent
  }

  public static push (
    thiz: any,
    data: void_p,
    args: ArrayLike<any>,
    fn: Function
  ): CallbackInfo {
    const info = new CallbackInfo(CallbackInfo.current, thiz, data, args, fn)
    CallbackInfo.current = info
    return info
  }

  public constructor (
    public parent: CallbackInfo | null,
    public thiz: any,
    public data: void_p,
    public args: ArrayLike<any>,
    public fn: Function
  ) {}

  public getNewTarget (envObject: Env): number {
    const thiz = this.thiz
    if (thiz == null || thiz.constructor == null) return 0
    return thiz instanceof this.fn ? envObject.ensureHandleId(thiz.constructor) : 0
  }
}
