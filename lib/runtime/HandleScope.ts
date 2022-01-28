import { Handle, HandleStore } from './Handle'
import { IStoreValue, Store } from './Store'
import { envStore, _global } from './util'

export interface IHandleScope extends IStoreValue {
  env: napi_env
  parent: IHandleScope | null
  child: IHandleScope | null
  handles: Array<Handle<any>>
  add<V> (value: V): Handle<V>
  addHandle<H extends Handle<any>> (handle: H): H
  dispose (): void
}

export class HandleScope implements IHandleScope {
  public env: napi_env
  public id: number
  public parent: IHandleScope | null
  public child: IHandleScope | null
  public handles: Array<Handle<any>>
  private _disposed: boolean = false

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

  public add<V extends unknown> (value: V): Handle<V> {
    if (value instanceof Handle) {
      throw new TypeError('Can not add a handle to scope')
    }

    if (value === undefined) {
      return envStore.get(this.env)!.handleStore.get(HandleStore.ID_UNDEFINED)!
    }
    if (value === null) {
      return envStore.get(this.env)!.handleStore.get(HandleStore.ID_NULL)!
    }
    if (typeof value === 'boolean') {
      return envStore.get(this.env)!.handleStore.get(value ? HandleStore.ID_TRUE : HandleStore.ID_FALSE)!
    }
    if (value === _global) {
      return envStore.get(this.env)!.handleStore.get(HandleStore.ID_GLOBAL)!
    }

    const h = Handle.create(this.env, value)
    this.handles.push(h)
    h.inScope = this
    return h
  }

  public addHandle<H extends Handle<any>> (handle: H): H {
    if (this.handles.indexOf(handle) !== -1) {
      return handle
    }
    this.handles.push(handle)
    handle.inScope = this
    return handle
  }

  public dispose (): void {
    if (this._disposed) return
    this._disposed = true
    const handles = this.handles.slice()
    for (let i = 0; i < handles.length; i++) {
      const handle = handles[i]
      handle.inScope = null
      handle.tryDispose()
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
    if (this._escapeCalled) return null
    this._escapeCalled = true
    let exists: boolean = false
    let index: number = -1
    let handleId: number
    if (typeof handle === 'number') {
      handleId = handle
      for (let i = 0; i < this.handles.length; i++) {
        if (this.handles[i].id === handleId) {
          index = i
          exists = true
          break
        }
      }
    } else {
      handleId = handle.id
      index = this.handles.indexOf(handle)
      exists = index !== -1
    }
    if (exists) {
      const envObject = envStore.get(this.env)!
      const h = envObject.handleStore.get(handleId)
      if (h && this.parent !== null) {
        this.handles.splice(index, 1)
        envObject.handleStore.remove(handleId)
        const newHandle = this.parent.add(h.value)
        return newHandle
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
