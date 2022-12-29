import { ExternalHandle, Handle, HandleStore } from './Handle'
import type { Env } from './env'
import type { Context } from './Context'
import type { IReusableStoreValue } from './Store'

/** @internal */
export class HandleScope implements IReusableStoreValue {
  public ctx!: Context
  public id!: number
  public parent!: HandleScope | null
  public start!: number
  public end!: number
  public _escapeCalled!: boolean

  protected static _create<T extends typeof HandleScope> (this: T, ctx: Context, parentScope: HandleScope | null): InstanceType<T> {
    const scope = ctx.scopeStore.push(ctx, parentScope)
    return scope as InstanceType<T>
  }

  public static create (ctx: Context, parentScope: HandleScope | null): HandleScope {
    return HandleScope._create(ctx, parentScope)
  }

  public constructor (ctx: Context, parentScope: HandleScope | null) {
    this.init(ctx, parentScope)
  }

  public init (ctx: Context, parentScope: HandleScope | null): void {
    this.ctx = ctx
    this.id = 0
    this.parent = parentScope
    this.start = parentScope ? parentScope.end : HandleStore.MIN_ID
    this.end = this.start
    this._escapeCalled = false
  }

  public add<V> (envObject: Env, value: V, isRefType: boolean): Handle<V> {
    const h = Handle.create(envObject, value, isRefType)
    this.end++
    return h
  }

  public addHandle (handle: Handle<any>): void {
    this.ctx.handleStore.pushHandle(handle)
    this.end++
  }

  public addExternal (envObject: Env, data: void_p): Handle<object> {
    const h = ExternalHandle.createExternal(envObject, data)
    this.end++
    return h
  }

  public dispose (): void {
    this.ctx.handleStore.pop(this.end - this.start)
    this.init(this.ctx, null)
  }

  public escape (handle: number): Handle<any> | null {
    if (this._escapeCalled) return null
    this._escapeCalled = true

    if (handle < this.start || handle >= this.end) {
      return null
    }

    this.ctx.handleStore.swap(handle, this.start)
    const h = this.ctx.handleStore.get(this.start)!
    this.start++
    this.parent!.end++
    return h
  }

  public escapeCalled (): boolean {
    return this._escapeCalled
  }
}
