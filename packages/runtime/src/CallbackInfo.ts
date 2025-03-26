import type { Env } from './env'

const EMPTY_ARGS = [] as const

export class CallbackInfo {
  public constructor (
    public id: number,
    public parent: CallbackInfo,
    public child: CallbackInfo | null,
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

  public dispose (): void {
    if (this.thiz !== undefined) this.thiz = undefined
    this.args = EMPTY_ARGS
    this.fn = null!
  }
}

const ROOT_CBINFO = new CallbackInfo(0, null!, null, null, 0, null!, null!)

export class CallbackInfoStack {
  public current: CallbackInfo = ROOT_CBINFO

  public get (id: number): CallbackInfo | null {
    if (id === 1) return ROOT_CBINFO.child!

    let info = ROOT_CBINFO
    for (let i = 0; i < id; ++i) {
      info = info.child!
      if (info === null) return null
    }
    return info === ROOT_CBINFO ? null : info
  }

  public pop (): void {
    const current = this.current
    if (current === ROOT_CBINFO) return
    this.current = current.parent
    current.dispose()
  }

  public push (
    thiz: any,
    data: void_p,
    args: ArrayLike<any>,
    fn: Function
  ): number {
    let info = this.current.child
    if (info) {
      info.thiz = thiz
      info.data = data
      info.args = args
      info.fn = fn
    } else {
      info = new CallbackInfo(this.current.id + 1, this.current, null, thiz, data, args, fn)
      this.current.child = info
    }
    this.current = info
    return info.id
  }

  public dispose (): void {
    this.current = null!
  }
}
