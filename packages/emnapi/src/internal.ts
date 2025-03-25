/* eslint-disable @stylistic/indent */

import { emnapiCtx } from 'emnapi:shared'
import { from64, makeDynCall, makeSetValue } from 'emscripten:parse-tools'
import { emnapiString } from './string'
import { emnapiExternalMemory } from './memory'
import { $CHECK_ARG, $PREAMBLE } from './macro'

export function emnapiCreateFunction<F extends (...args: any[]) => any> (envObject: Env, utf8name: Pointer<const_char>, length: size_t, cb: napi_callback, data: void_p): { status: napi_status; f: F } {
  from64('utf8name')

  const functionName = (!utf8name || !length) ? '' : (emnapiString.UTF8ToString(utf8name, length))

  let f: F

  const makeFunction = () => function (this: any): any {
    'use strict'
    const cbinfo = emnapiCtx.cbinfoStack.push(this, data, arguments, f)
    const scope = emnapiCtx.openScope(envObject)
    try {
      return envObject.callIntoModule((envObject) => {
        const napiValue = makeDynCall('ppp', 'cb')(envObject.id, cbinfo)
        return (!napiValue) ? undefined : emnapiCtx.handleStore.get(napiValue)!.value
      })
    } finally {
      emnapiCtx.cbinfoStack.pop()
      emnapiCtx.closeScope(envObject, scope)
    }
  }

  if (functionName === '') {
    f = makeFunction() as F
    return { status: napi_status.napi_ok, f }
  }

  if (!(/^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(functionName))) {
    return { status: napi_status.napi_invalid_arg, f: undefined! }
  }

// #if DYNAMIC_EXECUTION
    if (emnapiCtx.feature.supportNewFunction) {
      const _ = makeFunction()
      try {
        f = (new Function('_',
          'return function ' + functionName + '(){' +
            '"use strict";' +
            'return _.apply(this,arguments);' +
          '};'
        ))(_)
      } catch (_err) {
        f = makeFunction() as F
        if (emnapiCtx.feature.canSetFunctionName) Object.defineProperty(f, 'name', { value: functionName })
      }
    } else {
      f = makeFunction() as F
      if (emnapiCtx.feature.canSetFunctionName) Object.defineProperty(f, 'name', { value: functionName })
    }
// #else
    f = makeFunction() as F
    if (emnapiCtx.feature.canSetFunctionName) Object.defineProperty(f, 'name', { value: functionName })
// #endif
  return { status: napi_status.napi_ok, f }
}

export function emnapiDefineProperty (envObject: Env, obj: object, propertyName: string | symbol, method: napi_callback, getter: napi_callback, setter: napi_callback, value: napi_value, attributes: number, data: void_p): void {
  if (getter || setter) {
    let localGetter: () => any
    let localSetter: (v: any) => void
    if (getter) {
      localGetter = emnapiCreateFunction(envObject, 0, 0, getter, data).f
    }
    if (setter) {
      localSetter = emnapiCreateFunction(envObject, 0, 0, setter, data).f
    }
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      get: localGetter!,
      set: localSetter!
    }
    Object.defineProperty(obj, propertyName, desc)
  } else if (method) {
    const localMethod = emnapiCreateFunction(envObject, 0, 0, method, data).f
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: localMethod
    }
    Object.defineProperty(obj, propertyName, desc)
  } else {
    const desc: PropertyDescriptor = {
      configurable: (attributes & napi_property_attributes.napi_configurable) !== 0,
      enumerable: (attributes & napi_property_attributes.napi_enumerable) !== 0,
      writable: (attributes & napi_property_attributes.napi_writable) !== 0,
      value: emnapiCtx.handleStore.get(value)!.value
    }
    Object.defineProperty(obj, propertyName, desc)
  }
}

export function emnapiGetHandle (js_object: napi_value): { status: napi_status; handle?: Handle<any> } {
  let handle = emnapiCtx.handleStore.get(js_object)!
  if (!(handle.isObject() || handle.isFunction())) {
    return { status: napi_status.napi_invalid_arg }
  }

  if (typeof emnapiExternalMemory !== 'undefined' && ArrayBuffer.isView(handle.value)) {
    if (emnapiExternalMemory.wasmMemoryViewTable.has(handle.value)) {
      handle = emnapiCtx.addToCurrentScope(emnapiExternalMemory.wasmMemoryViewTable.get(handle.value)!)
    }
  }

  return { status: napi_status.napi_ok, handle }
}

export function emnapiWrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let referenceId: number
  return $PREAMBLE!(env, (envObject) => {
    if (!emnapiCtx.feature.supportFinalizer) {
      if (finalize_cb) {
        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)')
      }
      if (result) {
        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)')
      }
    }
    $CHECK_ARG!(envObject, js_object)

    const handleResult = emnapiGetHandle(js_object)
    if (handleResult.status !== napi_status.napi_ok) {
      return envObject.setLastError(handleResult.status)
    }
    const handle = handleResult.handle!

    if (envObject.getObjectBinding(handle.value).wrapped !== 0) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }

    let reference: Reference
    if (result) {
      if (!finalize_cb) return envObject.setLastError(napi_status.napi_invalid_arg)
      reference = emnapiCtx.createReferenceWithFinalizer(envObject, handle.id, 0, ReferenceOwnership.kUserland as any, finalize_cb, native_object, finalize_hint)
      from64('result')
      referenceId = reference.id
      makeSetValue('result', 0, 'referenceId', '*')
    } else if (finalize_cb) {
      reference = emnapiCtx.createReferenceWithFinalizer(envObject, handle.id, 0, ReferenceOwnership.kRuntime as any, finalize_cb, native_object, finalize_hint)
    } else {
      reference = emnapiCtx.createReferenceWithData(envObject, handle.id, 0, ReferenceOwnership.kRuntime as any, native_object)
    }

    envObject.getObjectBinding(handle.value).wrapped = reference.id
    return envObject.getReturnStatus()
  })
}

export function emnapiUnwrap (env: napi_env, js_object: napi_value, result: void_pp, action: UnwrapAction): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let data: number
  return $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, js_object)
    if (action === UnwrapAction.KeepWrap) {
      if (!result) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(js_object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const binding = envObject.getObjectBinding(value.value)
    const referenceId = binding.wrapped
    const ref = emnapiCtx.refStore.get(referenceId)
    if (!ref) return envObject.setLastError(napi_status.napi_invalid_arg)
    if (result) {
      from64('result')

      data = ref.data()
      makeSetValue('result', 0, 'data', '*')
    }
    if (action === UnwrapAction.RemoveWrap) {
      binding.wrapped = 0
      if ((ref.ownership() as unknown as ReferenceOwnership) === ReferenceOwnership.kUserland) {
        // When the wrap is been removed, the finalizer should be reset.
        ref.resetFinalizer()
      } else {
        ref.dispose()
      }
    }
    return envObject.getReturnStatus()
  })
}
