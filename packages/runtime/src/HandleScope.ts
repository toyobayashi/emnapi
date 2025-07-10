import { HandleStore } from './Handle'
import { Disposable } from './Disaposable'
import { External } from './External'

export interface ICallbackInfo {
  thiz: any
  holder: any
  data: void_p
  args: ArrayLike<any>
  fn: Function
}

export class HandleScope extends Disposable {
  public handleStore: HandleStore
  public id: number | bigint
  public parent: HandleScope | null
  public child: HandleScope | null
  public start: number
  public end: number
  private _escapeCalled: boolean = false
  public callbackInfo: ICallbackInfo

  public static create (parentScope: HandleScope | null, handleStore: HandleStore, start = parentScope?.end ?? 1, end = start): HandleScope {
    return new HandleScope(parentScope, handleStore, start, end)
  }

  public constructor (parentScope: HandleScope | null, handleStore: HandleStore, start = parentScope?.end ?? 1, end = start) {
    super()
    this.handleStore = handleStore
    this.id = 0
    this.parent = parentScope
    this.child = null
    if (parentScope !== null) parentScope.child = this
    this.start = start
    this.end = end
    this.callbackInfo = {
      thiz: undefined,
      holder: undefined,
      data: 0,
      args: undefined!,
      fn: undefined!
    }
  }

  public reuse (parentScope: HandleScope) {
    this.start = this.end = parentScope.end
    this._escapeCalled = false
  }

  public add<V> (value: V): number {
    const h = this.handleStore.push(value)
    this.end = h + 1
    return h
  }

  public addExternal (data: number | bigint): number {
    return this.add(new External(data))
  }

  public dispose (): void {
    const weak = this.callbackInfo.fn === undefined
    if (!weak) {
      this.callbackInfo.data = 0
      this.callbackInfo.args = undefined!
      this.callbackInfo.thiz = undefined
      this.callbackInfo.holder = undefined
      this.callbackInfo.fn = undefined!
    }
    if (this.start === this.end) return
    this.handleStore.erase(this.start, this.end, weak)
  }

  public escape (handle: number): number {
    if (handle < this.start || handle >= this.end) return handle
    if (this._escapeCalled) return 0
    this._escapeCalled = true

    if (handle < this.start || handle >= this.end) {
      return 0
    }

    const id = this.start
    this.handleStore.swap(handle, id)
    this.start++
    this.parent!.end++
    return id
  }

  public escapeCalled (): boolean {
    return this._escapeCalled
  }
}
