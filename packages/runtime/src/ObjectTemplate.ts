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

export interface PropertyHandlerConfig {
  getterWrap: ((property: Ptr, info: Ptr, getter: Ptr) => Ptr) | undefined
  setterWrap: ((property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr) | undefined
  queryWrap: ((property: Ptr, info: Ptr, query: Ptr) => Ptr) | undefined
  deleterWrap: ((property: Ptr, info: Ptr, deleter: Ptr) => Ptr) | undefined
  enumeratorWrap: ((info: Ptr, enumerator: Ptr) => Ptr) | undefined
  getter: Ptr
  setter: Ptr
  query: Ptr
  deleter: Ptr
  enumerator: Ptr
  data: any
  flags: number
}

export interface CallHandlerConfig {
  callbackWrap: (info: Ptr, callback: Ptr) => Ptr
  callback: Ptr
  data: any
}

/** @public */
export class ObjectTemplate extends Template {
  public Ctor: any

  public internalFieldCount: number = 0

  private _accessors: Map<string | symbol, AccessorConfig> = new Map()
  private _instances: WeakSet<object> = new WeakSet()
  private _namedPropertyHandler: PropertyHandlerConfig | undefined
  private _indexedPropertyHandler: PropertyHandlerConfig | undefined
  private _callAsFunctionHandler: CallHandlerConfig | undefined

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
    const config = this._createAccessorConfig(
      name, getterWrap, setterWrap, getter, setter, data,
      attribute, getterSideEffectType, setterSideEffectType
    )
    this._accessors.set(name, config)
  }

  setAccessorOnInstance (
    instance: any,
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
    const config = this._createAccessorConfig(
      name, getterWrap, setterWrap, getter, setter, data,
      attribute, getterSideEffectType, setterSideEffectType
    )
    this._instances.add(instance)
    this._defineAccessor(instance, config)
  }

  setInternalFieldCount (value: number) {
    this.internalFieldCount = value
  }

  setNamedPropertyHandler (config: PropertyHandlerConfig): void {
    this._namedPropertyHandler = config
  }

  setIndexedPropertyHandler (config: PropertyHandlerConfig): void {
    this._indexedPropertyHandler = config
  }

  setCallAsFunctionHandler (config: CallHandlerConfig): void {
    this._callAsFunctionHandler = config
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
      if (type === 'setter' && !instances.has(this)) {
        Object.defineProperty(this, config.name, {
          value,
          writable: !(config.attribute & 1),
          enumerable: !(config.attribute & 2),
          configurable: !(config.attribute & 4)
        })
        return undefined
      }
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
    const fields = Array(this.internalFieldCount)
    internalField.set(instance, fields)
    this._addPropertiesToInstance(instance)

    this._accessors.forEach(config => this._defineAccessor(instance, config))

    if (this._namedPropertyHandler || this._indexedPropertyHandler) {
      const proxy = this._createPropertyHandlerProxy(instance)
      this._instances.add(proxy)
      internalField.set(proxy, fields)
      return proxy
    }
    return instance
  }

  private _createPropertyHandlerProxy (target: any) {
    const { ctx } = this
    const configuredHandler = this._namedPropertyHandler || this._indexedPropertyHandler
    const resolveHandler = (property: PropertyKey): { config: PropertyHandlerConfig, index?: number } | undefined => {
      const index = typeof property === 'string' && /^(?:0|[1-9]\d*)$/.test(property)
        ? Number(property)
        : undefined
      if (index !== undefined && index <= 0xffffffff - 1 && this._indexedPropertyHandler) {
        return { config: this._indexedPropertyHandler, index }
      }
      if (typeof property === 'string' && this._namedPropertyHandler) {
        return { config: this._namedPropertyHandler }
      }
      return undefined
    }
    const invoke = (
      config: PropertyHandlerConfig,
      property: string | number,
      receiver: any,
      holder: any,
      kind: 'getter' | 'setter' | 'query' | 'deleter' | 'enumerator',
      value?: any
    ): { intercepted: boolean, value: any } => {
      const wrap = kind === 'getter'
        ? config.getterWrap
        : kind === 'setter'
          ? config.setterWrap
          : kind === 'query'
            ? config.queryWrap
            : kind === 'deleter'
              ? config.deleterWrap
              : config.enumeratorWrap
      if (!wrap) return { intercepted: false, value: undefined }
      const scope = ctx.openScope()
      const callbackInfo = scope.callbackInfo
      const trap = function () {}
      callbackInfo.data = config.data
      callbackInfo.args = kind === 'setter' ? [value] : []
      callbackInfo.thiz = receiver
      callbackInfo.holder = holder
      callbackInfo.fn = trap
      let result: Ptr = 0
      try {
        const propertyValue = typeof property === 'number'
          ? property
          : ctx.napiValueFromJsValue(property)
        if (kind === 'getter') {
          result = (wrap as (property: Ptr, info: Ptr, getter: Ptr) => Ptr)(propertyValue, scope.id, config.getter)
        } else if (kind === 'setter') {
          result = (wrap as (property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr)(
            propertyValue, ctx.napiValueFromJsValue(value), scope.id, config.setter
          )
        } else if (kind === 'query') {
          result = (wrap as (property: Ptr, info: Ptr, query: Ptr) => Ptr)(propertyValue, scope.id, config.query)
        } else if (kind === 'deleter') {
          result = (wrap as (property: Ptr, info: Ptr, deleter: Ptr) => Ptr)(propertyValue, scope.id, config.deleter)
        } else {
          result = (wrap as (info: Ptr, enumerator: Ptr) => Ptr)(scope.id, config.enumerator)
        }
      } catch (err) {
        ctx.throwException(err)
      }
      const returnValue = result ? ctx.jsValueFromNapiValue(result) : undefined
      ctx.closeScope(scope)
      if (ctx.hasPendingException()) {
        if (TryCatch.top) {
          TryCatch.top.setError(ctx.getAndClearLastException())
        } else {
          throw ctx.getAndClearLastException()
        }
      }
      return {
        intercepted: Number(result) !== 0,
        value: returnValue
      }
    }

    const getOwnPropertyDescriptor = (_target: any, property: PropertyKey) => {
      const handler = resolveHandler(property)
      if (!handler || !handler.config.queryWrap) return Reflect.getOwnPropertyDescriptor(target, property)
      const result = invoke(handler.config, handler.index === undefined ? String(property) : handler.index, target, target, 'query')
      if (!result.intercepted) return Reflect.getOwnPropertyDescriptor(target, property)
      if (result.value === undefined) return undefined
      const attr = Number(result.value)
      return {
        value: Reflect.get(target, property, target),
        writable: !(attr & 1),
        enumerable: !(attr & 2),
        configurable: !(attr & 4)
      }
    }

    let proxy: any
    const proxyHandler: ProxyHandler<any> = {
      get (_target, property, receiver) {
        const handler = resolveHandler(property)
        if (!handler || !handler.config.getterWrap) return Reflect.get(target, property, receiver)
        const result = invoke(handler.config, handler.index === undefined ? String(property) : handler.index, receiver, target, 'getter')
        return result.intercepted ? result.value : Reflect.get(target, property, receiver)
      },
      set (_target, property, value, receiver) {
        const handler = resolveHandler(property)
        if (!handler || !handler.config.setterWrap) return Reflect.set(target, property, value, receiver)
        const result = invoke(handler.config, handler.index === undefined ? String(property) : handler.index, receiver, target, 'setter', value)
        return result.intercepted ? true : Reflect.set(target, property, value, receiver)
      },
      has (_target, property) {
        const handler = resolveHandler(property)
        if (!handler || !handler.config.queryWrap) return Reflect.has(target, property)
        const result = invoke(handler.config, handler.index === undefined ? String(property) : handler.index, proxy, target, 'query')
        return result.intercepted ? result.value !== undefined : Reflect.has(target, property)
      },
      deleteProperty (_target, property) {
        const handler = resolveHandler(property)
        if (!handler || !handler.config.deleterWrap) return Reflect.deleteProperty(target, property)
        const result = invoke(handler.config, handler.index === undefined ? String(property) : handler.index, proxy, target, 'deleter')
        return result.intercepted ? Boolean(result.value) : Reflect.deleteProperty(target, property)
      },
      ownKeys (_target) {
        const handler = configuredHandler
        if (!handler || !handler.enumeratorWrap) return Reflect.ownKeys(target)
        const result = invoke(handler, '', proxy, target, 'enumerator')
        if (!Array.isArray(result.value)) return Reflect.ownKeys(target)
        const keys = result.value.map(key => typeof key === 'number' ? String(key) : key)
        for (const key of Reflect.ownKeys(target)) {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, key)
          if (descriptor && !descriptor.configurable && !keys.includes(key)) keys.push(key)
        }
        return keys
      },
      getOwnPropertyDescriptor,
      defineProperty (_target, property, descriptor) {
        return Reflect.defineProperty(target, property, descriptor)
      }
    }
    proxy = new Proxy(target, proxyHandler)
    return proxy
  }

  private _createAccessorConfig (
    name: string | symbol,
    getterWrap: (property: Ptr, info: Ptr, getter: Ptr) => Ptr,
    setterWrap: (property: Ptr, value: Ptr, info: Ptr, setter: Ptr) => Ptr,
    getter: Ptr,
    setter: Ptr,
    data: any,
    attribute: number,
    getterSideEffectType: number,
    setterSideEffectType: number
  ): AccessorConfig {
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
    return config
  }

  private _defineAccessor (instance: any, config: AccessorConfig): void {
    Object.defineProperty(instance, config.name, {
      get: config.getterFunction,
      set: config.setterFunction,
      enumerable: !(config.attribute & 2), // DontEnum
      configurable: !(config.attribute & 4) // DontDelete
    })
  }

  newInstance (_context: any) {
    const { ctx, Ctor } = this
    let instance: any
    if (this._callAsFunctionHandler) {
      const template = this
      instance = function (this: any, ...args: any[]) {
        const scope = ctx.openScope()
        const callbackInfo = scope.callbackInfo
        callbackInfo.data = template._callAsFunctionHandler!.data
        callbackInfo.args = args
        callbackInfo.thiz = this
        callbackInfo.holder = this
        callbackInfo.fn = instance
        let ret: Ptr = 0
        try {
          ret = template._callAsFunctionHandler!.callbackWrap(
            scope.id, template._callAsFunctionHandler!.callback
          )
        } catch (err) {
          ctx.throwException(err)
        }
        const retNumber = typeof ret === 'bigint' ? Number(ret) : ret
        const returnValue = retNumber === 0
          ? 0
          : (() => {
              const value = ctx.jsValueFromNapiValue(ret)
              return value === undefined && retNumber !== 1 && retNumber !== 2
                ? retNumber >= 0x100000000 || typeof ret === 'bigint'
                  ? Math.trunc(Number(ret) / 0x100000000)
                  : Number(ret) >> 1
                : value
            })()
        ctx.closeScope(scope)
        if (ctx.hasPendingException()) {
          throw ctx.getAndClearLastException()
        }
        return returnValue
      }
    } else {
      try {
        instance = new Ctor()
      } catch (err) {
        ctx.throwException(err)
      }
    }
    this.applyToInstance(instance)
    return instance
  }
}
