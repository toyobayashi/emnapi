// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export interface IHandleScope extends IStoreValue {
    env: napi_env
    parent: IHandleScope | null
    child: IHandleScope | null
    handles: Array<Handle<any>>
    add<S> (value: S): Handle<S>
    dispose (): void
  }

  export class HandleScope implements IHandleScope {
    public env: napi_env
    public id: number
    public parent: IHandleScope | null
    public child: IHandleScope | null
    public handles: Array<Handle<any>>

    protected static _create<T extends typeof HandleScope> (this: T, env: napi_env, parentScope: IHandleScope | null): InstanceType<T> {
      const scope = new this(env, parentScope)
      if (parentScope) {
        parentScope.child = scope
      }
      envStore.get(env)!.scopeStore.add(scope)
      return scope as InstanceType<T>
    }

    public static create (env: napi_env, parentScope: IHandleScope | null): HandleScope {
      return HandleScope._create(env, parentScope)
    }

    public constructor (env: napi_env, parentScope: IHandleScope | null) {
      this.env = env
      this.id = 0
      this.parent = parentScope
      this.child = null
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
      if (this.parent) {
        this.parent.child = null
      }
      this.parent = null
      envStore.get(this.env)!.scopeStore.remove(this.id)
    }
  }

  export class EscapableHandleScope extends HandleScope {
    public static create (env: napi_env, parentScope: IHandleScope | null): EscapableHandleScope {
      return EscapableHandleScope._create(env, parentScope)
    }

    private _escapeCalled: boolean

    public constructor (public env: napi_env, parentScope: IHandleScope | null) {
      super(env, parentScope)
      this._escapeCalled = false
    }

    public escape (handle: number | Handle<any>): Handle<any> | null {
      this._escapeCalled = true
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

    public escapeCalled (): boolean {
      return this._escapeCalled
    }
  }

  export class ScopeStore extends Store<IHandleScope> {
    public constructor () {
      super()
    }
  }
}
