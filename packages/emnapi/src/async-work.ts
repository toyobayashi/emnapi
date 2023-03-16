declare interface AsyncWork {
  env: number
  id: number
  resource: object
  resourceName: string
  asyncId: number
  triggerAsyncId: number
  /**
   * 0: not started
   * 1: queued
   * 2: started
   * 3: completed
   * 4: canceled
   */
  status: 0 | 1 | 2 | 3 | 4
  execute: number
  complete: number
  data: number
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function emnapiCreateIdGenerator () {
  const obj = {
    nextId: 1,
    list: [] as number[],
    generate: function (): number {
      let id: number
      if (obj.list.length) {
        id = obj.list.shift()!
      } else {
        id = obj.nextId
        obj.nextId++
      }
      return id
    },
    reuse: function (id: number) {
      obj.list.push(id)
    }
  }
  return obj
}

const emnapiAWST = {
  idGen: {} as unknown as ReturnType<typeof emnapiCreateIdGenerator>,
  values: [undefined] as unknown as AsyncWork[],
  queued: new Set<number>(),
  pending: [] as number[],

  init: function () {
    emnapiAWST.idGen = emnapiCreateIdGenerator()
    emnapiAWST.values = [undefined!]
    emnapiAWST.queued = new Set<number>()
    emnapiAWST.pending = []
  },

  create: function (env: napi_env, resource: object, resourceName: string, execute: number, complete: number, data: number): number {
    let asyncId = 0
    let triggerAsyncId = 0
    if (emnapiNodeBinding) {
      const asyncContext = emnapiNodeBinding.node.emitAsyncInit(resource, resourceName, -1)
      asyncId = asyncContext.asyncId
      triggerAsyncId = asyncContext.triggerAsyncId
    }

    const id = emnapiAWST.idGen.generate()
    emnapiAWST.values[id] = {
      env,
      id,
      resource,
      resourceName,
      asyncId,
      triggerAsyncId,
      status: 0,
      execute,
      complete,
      data
    }
    return id
  },

  callComplete: function (work: AsyncWork, status: napi_status): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const complete = work.complete
    const env = work.env
    const data = work.data
    const callback = (): void => {
      const envObject = emnapiCtx.envStore.get(env)!
      const scope = emnapiCtx.openScope(envObject)
      try {
        envObject.callIntoModule(() => {
          $makeDynCall('vpip', 'complete')(env, status, data)
        })
      } finally {
        emnapiCtx.closeScope(envObject, scope)
      }
    }

    if (emnapiNodeBinding) {
      emnapiNodeBinding.node.makeCallback(work.resource, callback, [], {
        asyncId: work.asyncId,
        triggerAsyncId: work.triggerAsyncId
      })
    } else {
      callback()
    }
  },

  queue: function (id: number): void {
    const work = emnapiAWST.values[id]
    if (!work) return
    if (work.status === 0) {
      work.status = 1
      if (emnapiAWST.queued.size >= 4) {
        emnapiAWST.pending.push(id)
        return
      }
      emnapiAWST.queued.add(id)
      const env = work.env
      const data = work.data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const execute = work.execute
      work.status = 2
      emnapiCtx.feature.setImmediate(() => {
        $makeDynCall('vpp', 'execute')(env, data)
        emnapiAWST.queued.delete(id)
        work.status = 3

        emnapiAWST.callComplete(work, napi_status.napi_ok)

        if (emnapiAWST.pending.length > 0) {
          const nextWorkId = emnapiAWST.pending.shift()!
          emnapiAWST.values[nextWorkId].status = 0
          emnapiAWST.queue(nextWorkId)
        }
      })
    }
  },

  cancel: function (id: number): napi_status {
    const index = emnapiAWST.pending.indexOf(id)
    if (index !== -1) {
      const work = emnapiAWST.values[id]
      if (work && (work.status === 1)) {
        work.status = 4
        emnapiAWST.pending.splice(index, 1)

        emnapiAWST.callComplete(work, napi_status.napi_cancelled)

        return napi_status.napi_ok
      } else {
        return napi_status.napi_generic_failure
      }
    }
    return napi_status.napi_generic_failure
  },

  remove: function (id: number): void {
    const work = emnapiAWST.values[id]
    if (!work) return
    if (emnapiNodeBinding) {
      emnapiNodeBinding.node.emitAsyncDestroy({
        asyncId: work.asyncId,
        triggerAsyncId: work.triggerAsyncId
      })
    }
    emnapiAWST.values[id] = undefined!
    emnapiAWST.idGen.reuse(id)
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

  const resourceName = String(emnapiCtx.handleStore.get(resource_name)!.value)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const id = emnapiAWST.create(env, resourceObject, resourceName, execute, complete, data)
  $makeSetValue('result', 0, 'id', '*')
  return envObject.clearLastError()
}

function _napi_delete_async_work (env: napi_env, work: number): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, work)

  emnapiAWST.remove(work)
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

emnapiImplementHelper('$emnapiCreateIdGenerator', undefined, emnapiCreateIdGenerator, [])
emnapiDefineVar('$emnapiAWST', emnapiAWST, ['$emnapiCreateIdGenerator'], 'emnapiAWST.init();')

emnapiImplement('napi_create_async_work', 'ippppppp', _napi_create_async_work, ['$emnapiAWST'])
emnapiImplement('napi_delete_async_work', 'ipp', _napi_delete_async_work, ['$emnapiAWST'])
emnapiImplement('napi_queue_async_work', 'ipp', _napi_queue_async_work, ['$emnapiAWST'])
emnapiImplement('napi_cancel_async_work', 'ipp', _napi_cancel_async_work, ['$emnapiAWST'])
