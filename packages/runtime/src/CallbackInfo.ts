import type { Env } from './env'

export class CallbackInfo {
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

export class CallbackInfoStack {
  public current: CallbackInfo | null = null

  public pop (): void {
    const current = this.current
    if (current === null) return
    this.current = current.parent
  }

  public push (
    thiz: any,
    data: void_p,
    args: ArrayLike<any>,
    fn: Function
  ): CallbackInfo {
    const info = new CallbackInfo(this.current, thiz, data, args, fn)
    this.current = info
    return info
  }

  public dispose (): void {
    this.current = null
  }
}
