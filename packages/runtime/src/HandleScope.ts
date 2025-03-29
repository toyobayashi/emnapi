import { Handle, HandleStore } from './Handle'
import { Disposable } from './Disaposable'
import { External } from './External'

export interface ICallbackInfo {
  thiz: any
  data: void_p
  args: ArrayLike<any>
  fn: Function
}

export class HandleScope extends Disposable {
  private handleStore: HandleStore
  public id: number | bigint
  public parent: HandleScope | null
  public child: HandleScope | null
  public start: number
  public end: number
  private _escapeCalled: boolean
  public callbackInfo: ICallbackInfo

  public constructor (parentScope: HandleScope | null, handleStore: HandleStore, start = parentScope?.end ?? 1, end = start) {
    super()
    this.handleStore = handleStore
    this.id = 0
    this.parent = parentScope
    this.child = null
    if (parentScope !== null) parentScope.child = this
    this.start = start
    this.end = end
    this._escapeCalled = false
    this.callbackInfo = {
      thiz: undefined,
      data: 0,
      args: undefined!,
      fn: undefined!
    }
  }

  public reuse (parentScope: HandleScope) {
    this.start = this.end = parentScope.end
    this._escapeCalled = false
  }

  public add<V> (value: V): Handle<V> {
    const h = this.handleStore.alloc(Handle<V>, value)
    this.end++
    return h
  }

  public addExternal (data: number | bigint): Handle<External> {
    return this.add(new External(data))
  }

  public dispose (): void {
    if (this.start === this.end || this.id === 0) return
    this.handleStore.erase(this.start, this.end)
  }

  public escape (handle: number): Handle<any> | null {
    if (this._escapeCalled) return null
    this._escapeCalled = true

    if (handle < this.start || handle >= this.end) {
      return null
    }

    this.handleStore.swap(handle, this.start)
    const h = this.handleStore.deref(this.start)!
    this.start++
    this.parent!.end++
    return h
  }

  public escapeCalled (): boolean {
    return this._escapeCalled
  }
}
