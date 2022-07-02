function napi_open_handle_scope (env: napi_env, result: Pointer<napi_handle_scope>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const scope = emnapi.openScope(envObject, emnapi.HandleScope)
      HEAP32[result >> 2] = scope.id
      return envObject.clearLastError()
    })
  })
}

function napi_close_handle_scope (env: napi_env, scope: napi_handle_scope): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [scope], () => {
      const scopeObject = emnapi.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== emnapi.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      emnapi.closeScope(envObject, emnapi.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_open_escapable_handle_scope (env: napi_env, result: Pointer<napi_escapable_handle_scope>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [result], () => {
      const scope = emnapi.openScope(envObject, emnapi.EscapableHandleScope)
      HEAP32[result >> 2] = scope.id
      return envObject.clearLastError()
    })
  })
}

function napi_close_escapable_handle_scope (env: napi_env, scope: napi_escapable_handle_scope): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [scope], () => {
      const scopeObject = emnapi.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== emnapi.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      emnapi.closeScope(envObject, emnapi.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_escape_handle (env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(envObject, [scope, escapee, result], () => {
      const scopeObject = emnapi.scopeStore.get(scope) as emnapi.EscapableHandleScope
      if (!scopeObject.escapeCalled()) {
        const newHandle = scopeObject.escape(escapee)
        HEAP32[result >> 2] = newHandle ? newHandle.id : 0
        return envObject.clearLastError()
      }
      return envObject.setLastError(napi_status.napi_escape_called_twice)
    })
  })
}

function napi_create_reference (
  env: napi_env,
  value: napi_value,
  initial_refcount: uint32_t,
  result: Pointer<napi_ref>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [value, result], () => {
      const handle = emnapi.handleStore.get(value)!
      if (!(handle.isObject() || handle.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      const ref = emnapi.Reference.create(envObject, handle.id, initial_refcount >>> 0, false)
      HEAP32[result >> 2] = ref.id
      return envObject.clearLastError()
    })
  })
}

function napi_delete_reference (
  env: napi_env,
  ref: napi_ref
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [ref], () => {
      emnapi.Reference.doDelete(emnapi.refStore.get(ref)!)
      return envObject.clearLastError()
    })
  })
}

function napi_reference_ref (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<uint32_t>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [ref], () => {
      const count = emnapi.refStore.get(ref)!.ref()
      if (result !== NULL) {
        HEAPU32[result >> 2] = count
      }
      return envObject.clearLastError()
    })
  })
}

function napi_reference_unref (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<uint32_t>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [ref], () => {
      const reference = emnapi.refStore.get(ref)!
      if (reference.refCount() === 0) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }
      const count = reference.unref()
      if (result !== NULL) {
        HEAPU32[result >> 2] = count
      }
      return envObject.clearLastError()
    })
  })
}

function napi_get_reference_value (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<napi_value>
): napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    if (!emnapi.supportFinalizer) return envObject.setLastError(napi_status.napi_generic_failure)
    return emnapi.checkArgs(envObject, [ref, result], () => {
      const reference = emnapi.refStore.get(ref)!
      const handleId = reference.get()
      HEAP32[result >> 2] = handleId
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_open_handle_scope', napi_open_handle_scope)
emnapiImplement('napi_close_handle_scope', napi_close_handle_scope)
emnapiImplement('napi_open_escapable_handle_scope', napi_open_escapable_handle_scope)
emnapiImplement('napi_close_escapable_handle_scope', napi_close_escapable_handle_scope)
emnapiImplement('napi_escape_handle', napi_escape_handle)

emnapiImplement('napi_create_reference', napi_create_reference)
emnapiImplement('napi_delete_reference', napi_delete_reference)
emnapiImplement('napi_reference_ref', napi_reference_ref)
emnapiImplement('napi_reference_unref', napi_reference_unref)
emnapiImplement('napi_get_reference_value', napi_get_reference_value)
