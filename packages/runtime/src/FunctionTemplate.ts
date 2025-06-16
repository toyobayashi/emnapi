import type { Context } from './Context'
import { TryCatch } from './TryCatch'

/** @public */
export class FunctionTemplate {
  public callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr
  public v8FunctionCallback: Ptr
  public data: any
  public ctx: Context
  public className: string | undefined

  constructor (
    ctx: Context,
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr,
    v8FunctionCallback: Ptr,
    data: any
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
      let returnValue: any
      try {
        callbackInfo.data = data
        callbackInfo.args = args
        callbackInfo.thiz = this
        callbackInfo.fn = _
        const ret = callback(ctx.getCurrentScope()!.id, v8FunctionCallback)
        returnValue = ret ? ctx.jsValueFromNapiValue(ret) : undefined
      } catch (err) {
        ctx.throwException(err)
      }
      ctx.closeScopeRaw(scope)
      if (ctx.hasPendingException()) {
        if (TryCatch.top) {
          TryCatch.top.setError(ctx.getAndClearLastException())
        } else {
          throw ctx.getAndClearLastException()
        }
      }
      return returnValue
    }
    if (typeof this.className === 'string') {
      this.ctx.features.setFunctionName?.(_, this.className)
    }
    return _
  }
}
