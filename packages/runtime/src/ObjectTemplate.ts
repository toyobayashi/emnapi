import type { Context } from './Context'
import { Template } from './Template'
import { TryCatch } from './TryCatch'

export const internalField = new WeakMap<object, any[]>()

/** @public */
export function getInternalFieldCount (instance: object) {
  return internalField.get(instance)?.length ?? 0
}

/** @public */
export function getInternalField (instance: object, index: number) {
  return internalField.get(instance)?.[index]
}

/** @public */
export function setInternalField (instance: object, index: number, value: any) {
  let fields = internalField.get(instance)
  if (fields) {
    fields[index] = value
  } else {
    fields = []
    fields[index] = value
    internalField.set(instance, fields)
  }
}

export interface AccessorConfig {
  name: string | symbol
  getterWrap: (property: Ptr, info: Ptr, getter: Ptr) => Ptr
  setterWrap: (property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr
  getter: Ptr
  setter: Ptr
  data: any
  attribute: number
  getterSideEffectType: number
  setterSideEffectType: number
}

/** @public */
export class ObjectTemplate extends Template {
  public Ctor: any

  public internalFieldCount: number = 0

  private _accessors: Map<string | symbol, AccessorConfig> = new Map()

  constructor (
    ctx: Context,
    Ctor?: any
  ) {
    super(ctx)
    this.Ctor = Ctor ?? Object
  }

  setAccessor (
    name: string | symbol,
    getterWrap: (property: Ptr, info: Ptr, getter: Ptr) => Ptr,
    setterWrap: (property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr,
    getter: Ptr,
    setter: Ptr,
    data: any,
    attribute: number,
    getterSideEffectType: number,
    setterSideEffectType: number
  ): void {
    this._accessors.set(name, {
      name,
      getterWrap,
      setterWrap,
      getter,
      setter,
      data,
      attribute,
      getterSideEffectType,
      setterSideEffectType
    })
  }

  setInternalFieldCount (value: number) {
    this.internalFieldCount = value
  }

  applyToInstance (instance: any) {
    internalField.set(instance, Array(this.internalFieldCount))
    this._addPropertiesToInstance(instance)

    const createAccessorWrapper = (type: 'getter' | 'setter', data: any, cb: (value?: any) => Ptr) => {
      const { ctx } = this
      function _ (this: any, value?: any) {
        const scope = ctx.openScopeRaw()
        const callbackInfo = scope.callbackInfo
        let returnValue: any
        try {
          callbackInfo.data = data
          callbackInfo.args = type === 'getter' ? [] : [value]
          callbackInfo.thiz = this
          callbackInfo.fn = _
          const ret = cb(value)
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
      return _
    }

    this._accessors.forEach((config, name) => {
      const { ctx } = this
      const { getterWrap, setterWrap, getter, setter, data, attribute } = config

      Object.defineProperty(instance, name, {
        get: getter
          ? createAccessorWrapper('getter', data, () => {
            return getterWrap(ctx.napiValueFromJsValue(name), ctx.getCurrentScope()!.id, getter)
          })
          : undefined,
        set: setter
          ? createAccessorWrapper('setter', data, (value) => {
            return setterWrap(ctx.napiValueFromJsValue(name), ctx.napiValueFromJsValue(value), ctx.getCurrentScope()!.id, setter)
          })
          : undefined,
        enumerable: !(attribute & 2), // DontEnum
        configurable: !(attribute & 4) // DontDelete
      })
    })
  }

  newInstance (_context: any) {
    const { ctx, Ctor } = this
    let instance: any
    try {
      instance = new Ctor()
    } catch (err) {
      ctx.throwException(err)
    }
    this.applyToInstance(instance)
    return instance
  }
}
