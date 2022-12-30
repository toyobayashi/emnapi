import type { HandleStore } from './Handle'
import type { IReusableStoreValue } from './Store'

/** @internal */
export class HandleScope implements IReusableStoreValue {
  public handleStore!: HandleStore
  public id!: number
  public parent!: HandleScope | null
  public start!: number
  public end!: number
  public _escapeCalled!: boolean

  public constructor (handleStore: HandleStore, parentScope: HandleScope | null, start: number) {
    this.init(handleStore, parentScope, start)
  }

  public init (handleStore: HandleStore, parentScope: HandleScope | null, start: number): void {
    this.handleStore = handleStore
    this.id = 0
    this.parent = parentScope
    this.start = start
    this.end = start
    this._escapeCalled = false
  }

  public add<V> (value: V): number {
    const h = this.handleStore.push(value)
    this.end++
    return h
  }

  public addExternal (data: void_p): number {
    const h = this.handleStore.pushExternal(data)
    this.end++
    return h
  }

  public dispose (): void {
    if (this.id === 0) return
    this.id = 0
    this.handleStore.erase(this.start, this.end)
  }

  public escape (handle: number): number | null {
    if (this._escapeCalled) return null
    this._escapeCalled = true

    if (handle < this.start || handle >= this.end) {
      return null
    }

    this.handleStore.swap(handle, this.start)
    const id = this.start
    this.start++
    this.parent!.end++
    return id
  }

  public escapeCalled (): boolean {
    return this._escapeCalled
  }
}
