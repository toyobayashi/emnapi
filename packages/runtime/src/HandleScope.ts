import { Handle, HandleStore } from './Handle'
import type { IReusableStoreValue } from './Store'

/** @internal */
export class HandleScope implements IReusableStoreValue {
  public handleStore!: HandleStore
  public id!: number
  public parent!: HandleScope | null
  public start!: number
  public end!: number
  public _escapeCalled!: boolean

  public constructor (handleStore: HandleStore, parentScope: HandleScope | null) {
    this.init(handleStore, parentScope)
  }

  public init (handleStore: HandleStore, parentScope: HandleScope | null): void {
    this.handleStore = handleStore
    this.id = 0
    this.parent = parentScope
    this.start = parentScope ? parentScope.end : HandleStore.MIN_ID
    this.end = this.start
    this._escapeCalled = false
  }

  public add<V> (value: V): Handle<V> {
    const h = this.handleStore.push(value)
    this.end++
    return h
  }

  public addExternal (data: void_p): Handle<object> {
    const h = this.handleStore.pushExternal(data)
    this.end++
    return h
  }

  public dispose (): void {
    this.handleStore.pop(this.end - this.start)
    this.init(this.handleStore, null)
  }

  public escape (handle: number): Handle<any> | null {
    if (this._escapeCalled) return null
    this._escapeCalled = true

    if (handle < this.start || handle >= this.end) {
      return null
    }

    this.handleStore.swap(handle, this.start)
    const h = this.handleStore.get(this.start)!
    this.start++
    this.parent!.end++
    return h
  }

  public escapeCalled (): boolean {
    return this._escapeCalled
  }
}
