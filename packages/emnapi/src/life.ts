function napi_open_handle_scope (env: napi_env, result: Pointer<napi_handle_scope>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const scope = emnapiCtx.openScope(envObject, emnapiRt.HandleScope)
      $from64('result')
      $makeSetValue('result', 0, 'scope.id', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_close_handle_scope (env: napi_env, scope: napi_handle_scope): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [scope], () => {
      const scopeObject = emnapiCtx.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== emnapiCtx.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      emnapiCtx.closeScope(envObject, emnapiCtx.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_open_escapable_handle_scope (env: napi_env, result: Pointer<napi_escapable_handle_scope>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [result], () => {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const scope = emnapiCtx.openScope(envObject, emnapiRt.EscapableHandleScope)
      $from64('result')
      $makeSetValue('result', 0, 'scope.id', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_close_escapable_handle_scope (env: napi_env, scope: napi_escapable_handle_scope): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [scope], () => {
      const scopeObject = emnapiCtx.scopeStore.get(scope)!
      if ((envObject.openHandleScopes === 0) || (scopeObject !== emnapiCtx.getCurrentScope()!)) {
        return napi_status.napi_handle_scope_mismatch
      }

      emnapiCtx.closeScope(envObject, emnapiCtx.scopeStore.get(scope)!)
      return envObject.clearLastError()
    })
  })
}

function napi_escape_handle (env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: Pointer<napi_value>): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [scope, escapee, result], () => {
      const scopeObject = emnapiCtx.scopeStore.get(scope) as emnapi.EscapableHandleScope
      if (!scopeObject.escapeCalled()) {
        $from64('escapee')
        $from64('result')

        const newHandle = scopeObject.escape(escapee)
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const value = newHandle ? newHandle.id : 0
        $makeSetValue('result', 0, 'value', '*')
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
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [value, result], () => {
      /* if (!emnapiRt.supportFinalizer && initial_refcount === 0) {
        envObject.tryCatch.setError(new emnapiRt.NotSupportWeakRefError('napi_create_reference', 'Parameter "initial_refcount" must be a positive integer'))
        return envObject.setLastError(napi_status.napi_pending_exception)
      } */
      const handle = emnapiCtx.handleStore.get(value)!
      if (!(handle.isObject() || handle.isFunction())) {
        return envObject.setLastError(napi_status.napi_object_expected)
      }
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const ref = emnapiRt.Reference.create(envObject, handle.id, initial_refcount >>> 0, false)
      $from64('result')
      $makeSetValue('result', 0, 'ref.id', '*')
      return envObject.clearLastError()
    })
  })
}

function napi_delete_reference (
  env: napi_env,
  ref: napi_ref
): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [ref], () => {
      emnapiRt.Reference.doDelete(emnapiCtx.refStore.get(ref)!)
      return envObject.clearLastError()
    })
  })
}

function napi_reference_ref (
  env: napi_env,
  ref: napi_ref,
  result: Pointer<uint32_t>
): napi_status {
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [ref], () => {
      const count = emnapiCtx.refStore.get(ref)!.ref()
      if (result) {
        $from64('result')
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
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [ref], () => {
      const reference = emnapiCtx.refStore.get(ref)!
      const refcount = reference.refCount()
      /* if (!emnapiRt.supportFinalizer && refcount === 1) {
        envObject.tryCatch.setError(new emnapiRt.NotSupportWeakRefError('napi_reference_unref', 'Can not unref a ref which count is 1'))
        return envObject.setLastError(napi_status.napi_pending_exception)
      } */
      if (refcount === 0) {
        return envObject.setLastError(napi_status.napi_generic_failure)
      }
      const count = reference.unref()
      if (result) {
        $from64('result')
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
  return emnapiCtx.checkEnv(env, (envObject) => {
    return emnapiCtx.checkArgs(envObject, [ref, result], () => {
      const reference = emnapiCtx.refStore.get(ref)!
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const handleId = reference.get()
      $from64('result')
      $makeSetValue('result', 0, 'handleId', '*')
      return envObject.clearLastError()
    })
  })
}

emnapiImplement('napi_open_handle_scope', 'ipp', napi_open_handle_scope)
emnapiImplement('napi_close_handle_scope', 'ipp', napi_close_handle_scope)
emnapiImplement('napi_open_escapable_handle_scope', 'ipp', napi_open_escapable_handle_scope)
emnapiImplement('napi_close_escapable_handle_scope', 'ipp', napi_close_escapable_handle_scope)
emnapiImplement('napi_escape_handle', 'ipppp', napi_escape_handle)

emnapiImplement('napi_create_reference', 'ippip', napi_create_reference)
emnapiImplement('napi_delete_reference', 'ipp', napi_delete_reference)
emnapiImplement('napi_reference_ref', 'ippp', napi_reference_ref)
emnapiImplement('napi_reference_unref', 'ippp', napi_reference_unref)
emnapiImplement('napi_get_reference_value', 'ippp', napi_get_reference_value)
