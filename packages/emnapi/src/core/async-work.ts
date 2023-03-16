var emnapiAWMT = {
  offset: {
    /* napi_ref */ resource: 0,
    /* double */ async_id: 8,
    /* double */ trigger_async_id: 16,
    /* napi_env */ env: 24,
    /* void* */ data: 1 * $POINTER_SIZE + 24,
    /* napi_async_execute_callback */ execute: 2 * $POINTER_SIZE + 24,
    /* napi_async_complete_callback */ complete: 3 * $POINTER_SIZE + 24,
    /* int32_t */ status: 4 * $POINTER_SIZE + 24,
    end: 5 * $POINTER_SIZE + 24
  },
  init () {},
  getResource (work: number): number {
    return emnapiTSFN.loadSizeTypeValue(work + emnapiAWMT.offset.resource, false)
  }
}

function _napi_create_async_work (env: napi_env, resource: napi_value, resource_name: napi_value, execute: number, complete: number, data: number, result: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, execute)
  $CHECK_ARG!(envObject, result)

  let resourceObject: any
  if (resource) {
    resourceObject = Object(emnapiCtx.handleStore.get(resource)!.value)
  } else {
    resourceObject = {}
  }

  $CHECK_ARG!(envObject, resource_name)

  if (singleThreadAsyncWork) {
    const resourceName = String(emnapiCtx.handleStore.get(resource_name)!.value)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data)
    $makeSetValue('result', 0, 'id', '*')
    return envObject.clearLastError()
  }

  const sizeofAW = emnapiAWMT.offset.end
  const aw = $makeMalloc('napi_create_async_work', 'sizeofAW')
  if (!aw) return envObject.setLastError(napi_status.napi_generic_failure)
  new Uint8Array(wasmMemory.buffer).subarray(aw, aw + sizeofAW).fill(0)
  const s = envObject.ensureHandleId(resourceObject)
  const resourceRef = emnapiCtx.createReference(envObject, s, 1, Ownership.kUserland as any)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resource_ = resourceRef.id
  $makeSetValue('aw', 0, 'resource_', '*')
  __emnapi_node_emit_async_init(s, resource_name, -1, aw + emnapiAWMT.offset.async_id)
  $makeSetValue('aw', 'emnapiAWMT.offset.env', 'env', '*')
  $makeSetValue('aw', 'emnapiAWMT.offset.execute', 'execute', '*')
  $makeSetValue('aw', 'emnapiAWMT.offset.complete', 'complete', '*')
  $makeSetValue('aw', 'emnapiAWMT.offset.data', 'data', '*')
  $from64('result')
  $makeSetValue('result', 0, 'aw', '*')
  return envObject.clearLastError()
}

function _napi_delete_async_work (env: napi_env, work: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, work)

  if (singleThreadAsyncWork) {
    emnapiAWST.remove(work)
  } else {
    const resource = emnapiAWMT.getResource(work)
    emnapiCtx.refStore.get(resource)!.dispose()

    if (emnapiNodeBinding) {
      const view = new DataView(wasmMemory.buffer)
      const asyncId = view.getFloat64(work + emnapiAWMT.offset.async_id, true)
      const triggerAsyncId = view.getFloat64(work + emnapiAWMT.offset.trigger_async_id, true)
      __emnapi_node_emit_async_destroy(asyncId, triggerAsyncId)
    }

    _free($to64('work') as number)
  }
  return envObject.clearLastError()
}

function _napi_queue_async_work (env: napi_env, work: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, work)

  emnapiAWST.queue(work)
  return envObject.clearLastError()
}

function _napi_cancel_async_work (env: napi_env, work: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, work)

  const status = emnapiAWST.cancel(work)
  if (status === napi_status.napi_ok) return envObject.clearLastError()
  return envObject.setLastError(status)
}

emnapiImplement('napi_create_async_work', 'ippppppp', _napi_create_async_work)
emnapiImplement('napi_delete_async_work', 'ipp', _napi_delete_async_work)
emnapiImplement('napi_queue_async_work', 'ipp', _napi_queue_async_work)
emnapiImplement('napi_cancel_async_work', 'ipp', _napi_cancel_async_work)
