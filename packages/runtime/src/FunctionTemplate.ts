import type { Isolate } from './Isolate'
import { ObjectTemplate, findHolder } from './ObjectTemplate'
import { Template } from './Template'
import { TryCatch } from './TryCatch'

/** @public */
export class Signature {
  public receiver: FunctionTemplate | undefined

  public constructor (receiver: FunctionTemplate | undefined) {
    this.receiver = receiver
  }
}

/** @public */
export class FunctionTemplate extends Template {
  public callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr
  public v8FunctionCallback: Ptr
  public data: any
  public className: string | undefined
  public signature: Signature | undefined

  private _instanceTemplate: ObjectTemplate | undefined
  private _prototypeTemplate: ObjectTemplate | undefined
  private _cached: [((...args: any[]) => any) | undefined]

  constructor (
    ctx: Isolate,
    callback: (info: napi_callback_info, v8FunctionCallback: Ptr) => Ptr,
    v8FunctionCallback: Ptr,
    data: any,
    signature?: Signature
  ) {
    super(ctx)
    this.ctx = ctx
    this.callback = callback
    this.v8FunctionCallback = v8FunctionCallback
    this.data = data
    this.className = undefined
    this.signature = signature
    this._cached = [undefined]
  }

  setClassName (name: string) {
    this.className = name
  }

  instanceTemplate (): ObjectTemplate {
    if (!this._instanceTemplate) {
      this._instanceTemplate = new ObjectTemplate(this.ctx)
    }
    return this._instanceTemplate
  }

  prototypeTemplate (): ObjectTemplate {
    if (!this._prototypeTemplate) {
      this._prototypeTemplate = new ObjectTemplate(this.ctx)
    }
    return this._prototypeTemplate
  }

  getFunction () {
    if (this._cached[0]) {
      return this._cached[0]
    }
    const { ctx, callback, v8FunctionCallback, data, signature, _instanceTemplate } = this
    function _ (this: any, ...args: any[]) {
      if (signature && signature.receiver) {
        const f = signature.receiver.getFunction()
        if (!(this instanceof f)) {
          throw new TypeError('Illegal invocation')
        }
      }
      const scope = ctx.openScope()
      const callbackInfo = scope.callbackInfo
      let returnValue: any
      try {
        callbackInfo.data = data
        callbackInfo.args = args
        callbackInfo.thiz = this
        callbackInfo.holder = findHolder(this, _) || this
        callbackInfo.fn = _
        if (_instanceTemplate && this instanceof _) {
          _instanceTemplate.applyToInstance(this)
        }
        const ret = callback(ctx.getCurrentScope()!.id, v8FunctionCallback)
        returnValue = ret ? ctx.jsValueFromNapiValue(ret) : undefined
      } catch (err) {
        if (err !== 'unwind') {
          ctx.throwException(err)
        }
      } finally {
        ctx.closeScope(scope)
      }
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
    if (this._prototypeTemplate) {
      this._prototypeTemplate.applyToInstance(_.prototype)
    }
    this._addPropertiesToInstance(_)
    this._cached[0] = _
    return _
  }
}
