import { emnapiAsyncWorkPoolSize, emnapiNodeBinding, emnapiCtx } from 'emnapi:shared'

export interface AsyncWork {
  id: number
  resource: object
  asyncId: number
  triggerAsyncId: number
  env: number
  data: number
  execute: number
  complete: number
  /**
   * 0: not started
   * 1: queued
   * 2: started
   * 3: completed
   * 4: canceled
  */
  status: 0 | 1 | 2 | 3 | 4
}

/**
 * @__postset
 * ```
 * emnapiAWST.init();
 * ```
 */
export var emnapiAWST = {
  idGen: {} as unknown as {
    nextId: number
    list: number[]
    generate: () => number
    reuse: (id: number) => void
  },
  values: [undefined] as unknown as AsyncWork[],
  queued: new Set<number>(),
  pending: [] as number[],

  init: function () {
    const idGen = {
      nextId: 1,
      list: [] as number[],
      generate: function (): number {
        let id: number
        if (idGen.list.length) {
          id = idGen.list.shift()!
        } else {
          id = idGen.nextId
          idGen.nextId++
        }
        return id
      },
      reuse: function (id: number) {
        idGen.list.push(id)
      }
    }
    emnapiAWST.idGen = idGen
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
      if (!complete) return
      const envObject = emnapiCtx.envStore.get(env)!
      const scope = emnapiCtx.openScope(envObject)
      try {
        (envObject as NodeEnv).callbackIntoModule(true, () => {
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
      if (emnapiAWST.queued.size >= (Math.abs(emnapiAsyncWorkPoolSize) || 4)) {
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

        emnapiCtx.feature.setImmediate(() => {
          emnapiAWST.callComplete(work, napi_status.napi_ok)
        })

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

        emnapiCtx.feature.setImmediate(() => {
          emnapiAWST.callComplete(work, napi_status.napi_cancelled)
        })

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
