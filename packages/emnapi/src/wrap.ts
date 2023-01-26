function napi_define_class (
  env: napi_env,
  utf8name: Pointer<const_char>,
  length: size_t,
  constructor: napi_callback,
  callback_data: void_p,
  property_count: size_t,
  properties: Const<Pointer<napi_property_descriptor>>,
  result: Pointer<napi_value>
// @ts-expect-error
): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let propPtr: number, valueHandleId: number, attributes: number

  $PREAMBLE!(env, (envObject) => {
    $CHECK_ARG!(envObject, result)
    $CHECK_ARG!(envObject, constructor)
    $from64('length')
    $from64('properties')
    $from64('property_count')

    property_count = property_count >>> 0

    if (property_count > 0) {
      if (!properties) return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    if ((length < -1) || (length > 2147483647) || (!utf8name)) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
    const fresult = emnapiCreateFunction(envObject, utf8name, length, constructor, callback_data)
    if (fresult.status !== napi_status.napi_ok) return envObject.setLastError(fresult.status)
    const F = fresult.f

    let propertyName: string | symbol

    for (let i = 0; i < property_count; i++) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      propPtr = properties + (i * ($POINTER_SIZE * 8))
      const utf8Name = $makeGetValue('propPtr', 0, '*')
      const name = $makeGetValue('propPtr', POINTER_SIZE, '*')
      const method = $makeGetValue('propPtr', POINTER_SIZE * 2, '*')
      const getter = $makeGetValue('propPtr', POINTER_SIZE * 3, '*')
      const setter = $makeGetValue('propPtr', POINTER_SIZE * 4, '*')
      const value = $makeGetValue('propPtr', POINTER_SIZE * 5, '*')
      attributes = $makeGetValue('propPtr', POINTER_SIZE * 6, POINTER_WASM_TYPE) as number
      $from64('attributes')
      const data = $makeGetValue('propPtr', POINTER_SIZE * 7, '*')

      if (utf8Name) {
        propertyName = UTF8ToString(utf8Name)
      } else {
        if (!name) {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
        propertyName = emnapiCtx.handleStore.get(name)!.value
        if (typeof propertyName !== 'string' && typeof propertyName !== 'symbol') {
          return envObject.setLastError(napi_status.napi_name_expected)
        }
      }

      if ((attributes & napi_property_attributes.napi_static) !== 0) {
        emnapiDefineProperty(envObject, F, propertyName, method, getter, setter, value, attributes, data)
        continue
      }
      emnapiDefineProperty(envObject, F.prototype, propertyName, method, getter, setter, value, attributes, data)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const valueHandle = emnapiCtx.addToCurrentScope(F)
    valueHandleId = valueHandle.id
    $from64('result')
    $makeSetValue('result', 0, 'valueHandleId', '*')
    return envObject.getReturnStatus()
  })
}

function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  if (!emnapiCtx.feature.supportFinalizer) {
    if (finalize_cb) {
      $PREAMBLE!(env, () => {
        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "finalize_cb" must be 0(NULL)')
      })
    }
    if (result) {
      $PREAMBLE!(env, () => {
        throw emnapiCtx.createNotSupportWeakRefError('napi_wrap', 'Parameter "result" must be 0(NULL)')
      })
    }
  }
  return emnapiWrap(env, js_object, native_object, finalize_cb, finalize_hint, result)
}

function napi_unwrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.KeepWrap)
}

function napi_remove_wrap (env: napi_env, js_object: napi_value, result: void_pp): napi_status {
  return emnapiUnwrap(env, js_object, result, UnwrapAction.RemoveWrap)
}

// @ts-expect-error
function napi_type_tag_object (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>): napi_status {
  $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    $from64('type_tag')
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const binding = envObject.getObjectBinding(value.value)
    if (binding.tag !== null) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    binding.tag = [
      $makeGetValue('type_tag', '0', 'u32') as number,
      $makeGetValue('type_tag', '4', 'u32') as number,
      $makeGetValue('type_tag', '8', 'u32') as number,
      $makeGetValue('type_tag', '12', 'u32') as number
    ]

    return envObject.getReturnStatus()
  })
}

// @ts-expect-error
function napi_check_object_type_tag (env: napi_env, object: napi_value, type_tag: Const<Pointer<unknown>>, result: Pointer<bool>): napi_status {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, one-var
  let ret = true, i: number

  $PREAMBLE!(env, (envObject) => {
    if (!object) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const value = emnapiCtx.handleStore.get(object)!
    if (!(value.isObject() || value.isFunction())) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_object_expected)
    }
    if (!type_tag) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    if (!result) {
      return envObject.setLastError(envObject.tryCatch.hasCaught() ? napi_status.napi_pending_exception : napi_status.napi_invalid_arg)
    }
    const binding = envObject.getObjectBinding(value.value)
    if (binding.tag !== null) {
      $from64('type_tag')
      for (i = 0; i < 4; i++) {
        const x = $makeGetValue('type_tag', 'i * 4', 'u32')
        if (x !== binding.tag[i]) {
          ret = false
          break
        }
      }
    } else {
      ret = false
    }

    $from64('result')
    $makeSetValue('result', 0, 'ret ? 1 : 0', 'i8')

    return envObject.getReturnStatus()
  })
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _napi_add_finalizer (env: napi_env, js_object: napi_value, finalize_data: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!

  if (!emnapiCtx.feature.supportFinalizer) {
    return envObject.setLastError(napi_status.napi_generic_failure)
  }

  $CHECK_ARG!(envObject, js_object)
  $CHECK_ARG!(envObject, finalize_cb)

  const handleResult = emnapiGetHandle(js_object)
  if (handleResult.status !== napi_status.napi_ok) {
    return envObject.setLastError(handleResult.status)
  }
  const handle = handleResult.handle!

  const ownership: Ownership = !result ? Ownership.kRuntime : Ownership.kUserland
  $from64('finalize_data')
  $from64('finalize_cb')
  $from64('finalize_hint')
  const reference = emnapiCtx.createReference(envObject, handle.id, 0, ownership as any, finalize_cb, finalize_data, finalize_hint)
  if (result) {
    $from64('result')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const referenceId = reference.id
    $makeSetValue('result', 0, 'referenceId', '*')
  }

  return envObject.clearLastError()
}

emnapiImplement('napi_define_class', 'ipppppppp', napi_define_class, ['$emnapiCreateFunction', '$emnapiDefineProperty'])
emnapiImplement('napi_wrap', 'ipppppp', napi_wrap, ['$emnapiWrap'])
emnapiImplement('napi_unwrap', 'ippp', napi_unwrap, ['$emnapiUnwrap'])
emnapiImplement('napi_remove_wrap', 'ippp', napi_remove_wrap, ['$emnapiUnwrap'])
emnapiImplement('napi_type_tag_object', 'ippp', napi_type_tag_object)
emnapiImplement('napi_check_object_type_tag', 'ipppp', napi_check_object_type_tag)
emnapiImplement('napi_add_finalizer', 'ipppppp', _napi_add_finalizer, ['$emnapiGetHandle'])
