function napi_open_handle_scope (env: napi_env, result: Pointer<napi_handle_scope>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const scope = envObject.openScope(emnapi.HandleScope)
      HEAP32[result >> 2] = scope.id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_close_handle_scope (env: napi_env, scope: napi_handle_scope): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [scope], () => {
      if (envObject.openHandleScopes === 0) {
        return emnapi.napi_status.napi_handle_scope_mismatch
      }

      try {
        envObject.closeScope(envObject.scopeStore.get(scope)!)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_open_escapable_handle_scope (env: napi_env, result: Pointer<napi_escapable_handle_scope>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [result], () => {
      const scope = envObject.openScope(emnapi.EscapableHandleScope)
      HEAP32[result >> 2] = scope.id
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_close_escapable_handle_scope (env: napi_env, scope: napi_escapable_handle_scope): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [scope], () => {
      if (envObject.openHandleScopes === 0) {
        return emnapi.napi_status.napi_handle_scope_mismatch
      }

      try {
        envObject.closeScope(envObject.scopeStore.get(scope)!)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_escape_handle (env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: Pointer<napi_value>): emnapi.napi_status {
  return emnapi.checkEnv(env, (envObject) => {
    return emnapi.checkArgs(env, [scope, escapee, result], () => {
      try {
        const scopeObject = envObject.scopeStore.get(scope) as emnapi.EscapableHandleScope
        if (!scopeObject.escapeCalled()) {
          scopeObject.escape(escapee)
          return emnapi.napi_clear_last_error(env)
        }
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_escape_called_twice)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
      }
    })
  })
}

emnapiImplement('napi_open_handle_scope', napi_open_handle_scope)
emnapiImplement('napi_close_handle_scope', napi_close_handle_scope)
emnapiImplement('napi_open_escapable_handle_scope', napi_open_escapable_handle_scope)
emnapiImplement('napi_close_escapable_handle_scope', napi_close_escapable_handle_scope)
emnapiImplement('napi_escape_handle', napi_escape_handle)
