import type { Isolate } from './Isolate'
import { Template } from './Template'
import { TryCatch } from './TryCatch'

export function findHolder (obj: any, _target: any) {
  // TODO
  /* let ret: any
  while (obj != null) {
    const descs = Object.getOwnPropertyDescriptors(obj)
    const keys = Object.keys(descs)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const desc = descs[key]
      if (desc.value === target || desc.get === target || desc.set === target) {
        return obj
      }
    }

    obj = Object.getPrototypeOf(obj)
  }
  return ret */
  return obj
}

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
  getterFunction: (() => any) | undefined
  setterFunction: ((value: any) => void) | undefined
}

/** @public */
export class ObjectTemplate extends Template {
  public Ctor: any

  public internalFieldCount: number = 0

  private _accessors: Map<string | symbol, AccessorConfig> = new Map()
  private _instances: WeakSet<object> = new WeakSet()

  constructor (
    ctx: Isolate,
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
    const config: AccessorConfig = {
      name,
      getterWrap,
      setterWrap,
      getter,
      setter,
      data,
      attribute,
      getterSideEffectType,
      setterSideEffectType,
      getterFunction: undefined,
      setterFunction: undefined
    }
    config.getterFunction = getter
      ? this._createAccessorWrapper('getter', config)
      : undefined
    config.setterFunction = setter
      ? this._createAccessorWrapper('setter', config)
      : undefined
    this._accessors.set(name, config)
  }

  setInternalFieldCount (value: number) {
    this.internalFieldCount = value
  }

  private _createAccessorWrapper (type: 'getter' | 'setter', config: AccessorConfig) {
    const { ctx } = this
    const instances = this._instances
    const resolveHolder = (receiver: any) => {
      let holder = receiver
      while (holder != null && !instances.has(holder)) {
        holder = Object.getPrototypeOf(holder)
      }
      return holder || receiver
    }
    function accessor (this: any, value?: any) {
      const scope = ctx.openScope()
      const callbackInfo = scope.callbackInfo
      let returnValue: any
      try {
        callbackInfo.data = config.data
        callbackInfo.args = type === 'getter' ? [] : [value]
        callbackInfo.thiz = this
        callbackInfo.holder = resolveHolder(this)
        callbackInfo.fn = accessor
        const ret = type === 'getter'
          ? config.getterWrap(ctx.napiValueFromJsValue(config.name), ctx.getCurrentScope().id, config.getter)
          : config.setterWrap(ctx.napiValueFromJsValue(config.name), ctx.napiValueFromJsValue(value), ctx.getCurrentScope().id, config.setter)
        returnValue = ret ? ctx.jsValueFromNapiValue(ret) : undefined
      } catch (err) {
        ctx.throwException(err)
      }
      ctx.closeScope(scope)
      if (ctx.hasPendingException()) {
        if (TryCatch.top) {
          TryCatch.top.setError(ctx.getAndClearLastException())
        } else {
          throw ctx.getAndClearLastException()
        }
      }
      return returnValue
    }
    return accessor
  }

  applyToInstance (instance: any) {
    this._instances.add(instance)
    internalField.set(instance, Array(this.internalFieldCount))
    this._addPropertiesToInstance(instance)

    this._accessors.forEach((config, name) => {
      Object.defineProperty(instance, name, {
        get: config.getterFunction,
        set: config.setterFunction,
        enumerable: !(config.attribute & 2), // DontEnum
        configurable: !(config.attribute & 4) // DontDelete
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
