import type { Context } from './Context'

/** @public */
export class FunctionTemplate {
  public callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr
  public v8FunctionCallback: Ptr
  public data: Ptr
  public ctx: Context
  public className: string | undefined

  constructor (
    ctx: Context,
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr,
    v8FunctionCallback: Ptr,
    data: Ptr
  ) {
    this.ctx = ctx
    this.callback = callback
    this.v8FunctionCallback = v8FunctionCallback
    this.data = data
    this.className = undefined
  }

  setClassName (name: string) {
    this.className = name
  }

  getFunction () {
    const { ctx, callback, v8FunctionCallback, data } = this
    function _ (this: any, ...args: any[]) {
      const scope = ctx.openScopeRaw()
      const callbackInfo = scope.callbackInfo
      try {
        callbackInfo.data = data
        callbackInfo.args = args
        callbackInfo.thiz = this
        callbackInfo.fn = _
        const ret = callback(ctx.getCurrentScope()!.id, v8FunctionCallback)
        return ret ? ctx.jsValueFromNapiValue(ret) : undefined
      } finally {
        callbackInfo.data = 0!
        callbackInfo.args = undefined!
        callbackInfo.thiz = undefined!
        callbackInfo.fn = undefined!
        ctx.closeScopeRaw(scope)
      }
    }
    if (typeof this.className === 'string') {
      this.ctx.features.setFunctionName?.(_, this.className)
    }
    return _
  }
}
