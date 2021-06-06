// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export interface IHandleScope {
    parent: IHandleScope | null
    handles: Array<Handle<any>>
    add<S> (value: S): Handle<S>
    dispose (): void
  }
  export class HandleScope implements IHandleScope {
    public env: napi_env
    public parent: IHandleScope | null
    public handles: Array<Handle<any>>
    public constructor (env: napi_env, parentScope: IHandleScope | null) {
      this.env = env
      this.parent = parentScope
      this.handles = []
    }

    public add<S> (value: S): Handle<S> {
      const h = Handle.create(this.env, value)
      this.handles.push(h)
      return h
    }

    public dispose (): void {
      const handles = this.handles.slice()
      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i]
        handle.dispose()
      }
      this.handles.length = 0
      this.parent = null
    }
  }

  export class EscapableHandleScope extends HandleScope {
    public constructor (public env: napi_env, parentScope: IHandleScope | null) {
      super(env, parentScope)
    }

    public escape (handle: number | Handle<any>): Handle<any> | null {
      let exists: boolean = false
      let handleId: number
      if (typeof handle === 'number') {
        handleId = handle
        exists = this.handles.filter(h => h.id === handle).length > 0
      } else {
        handleId = handle.id
        exists = this.handles.indexOf(handle) !== -1
      }
      if (exists) {
        const envObject = envStore.get(this.env)!
        const h = envObject.handleStore.get(handleId)
        if (h && this.parent !== null) {
          return this.parent.add(h.value)
        } else {
          return null
        }
      } else {
        return null
      }
    }
  }

}
