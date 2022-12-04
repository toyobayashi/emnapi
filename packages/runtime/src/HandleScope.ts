import { Handle, HandleStore } from './Handle'
import type { IStoreValue } from './Store'
import { _global } from './util'
import type { Env } from './env'
import type { Context } from './Context'

/** @internal */
export interface IHandleScope extends IStoreValue {
  parent: IHandleScope | null
  child: IHandleScope | null
  handles: Array<Handle<any>>
  add<V> (envObject: Env, value: V): Handle<V>
  addHandle<H extends Handle<any>> (handle: H): H
  clearHandles (): void
  dispose (): void
}

/** @internal */
export class HandleScope implements IHandleScope {
  public id: number
  public parent: IHandleScope | null
  public child: IHandleScope | null
  public handles: Array<Handle<any>>
  private _disposed: boolean = false

  protected static _create<T extends typeof HandleScope> (this: T, ctx: Context, parentScope: IHandleScope | null): InstanceType<T> {
    const scope = new this(ctx, parentScope)
    if (parentScope) {
      parentScope.child = scope
    }
    ctx.scopeStore.add(scope)
    return scope as InstanceType<T>
  }

  public static create (ctx: Context, parentScope: IHandleScope | null): HandleScope {
    return HandleScope._create(ctx, parentScope)
  }

  public constructor (protected readonly ctx: Context, parentScope: IHandleScope | null) {
    this.id = 0
    this.parent = parentScope
    this.child = null
    this.handles = []
  }

  public add<V> (envObject: Env, value: V): Handle<V> {
    if (value instanceof Handle) {
      throw new TypeError('Can not add a handle to scope')
    }

    if (value === undefined) {
      return envObject.ctx.handleStore.get(HandleStore.ID_UNDEFINED)!
    }
    if (value === null) {
      return envObject.ctx.handleStore.get(HandleStore.ID_NULL)!
    }
    if (typeof value === 'boolean') {
      return envObject.ctx.handleStore.get(value ? HandleStore.ID_TRUE : HandleStore.ID_FALSE)!
    }
    if ((value as any) === _global) {
      return envObject.ctx.handleStore.get(HandleStore.ID_GLOBAL)!
    }

    const h = Handle.create(envObject, value)
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

  public clearHandles (): void {
    if (this.handles.length > 0) {
      const handles = this.handles
      for (let i = 0; i < handles.length; i++) {
        const handle = handles[i]
        handle.inScope = null
        handle.tryDispose()
      }
      this.handles = []
    }
  }

  public dispose (): void {
    if (this._disposed) return
    this._disposed = true
    this.clearHandles()
    this.parent = null
    this.child = null
    this.ctx.scopeStore.remove(this.id)
  }
}

/** @internal */
export class EscapableHandleScope extends HandleScope {
  public static create (ctx: Context, parentScope: IHandleScope | null): EscapableHandleScope {
    return EscapableHandleScope._create(ctx, parentScope)
  }

  private _escapeCalled: boolean

  public constructor (ctx: Context, parentScope: IHandleScope | null) {
    super(ctx, parentScope)
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
      const h = this.ctx.handleStore.get(handleId)
      if (h && this.parent !== null) {
        const envObject = h.getEnv()!
        this.handles.splice(index, 1)
        this.ctx.handleStore.remove(handleId)
        const newHandle = this.parent.add(envObject, h.value)
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
