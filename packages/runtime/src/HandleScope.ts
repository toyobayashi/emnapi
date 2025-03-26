import type { Handle, HandleStore } from './Handle'
import { External } from './External'

export interface ICallbackInfo {
  thiz: any
  data: void_p
  args: ArrayLike<any>
  fn: Function
}

export class HandleScope {
  public handleStore: HandleStore
  public id: number
  public parent: HandleScope | null
  public child: HandleScope | null
  public start: number
  public end: number
  private _escapeCalled: boolean
  private _callbackInfo: ICallbackInfo | null

  public constructor (handleStore: HandleStore, id: number, parentScope: HandleScope | null, start: number, end = start) {
    this.handleStore = handleStore
    this.id = id
    this.parent = parentScope
    this.child = null
    if (parentScope !== null) parentScope.child = this
    this.start = start
    this.end = end
    this._escapeCalled = false
    this._callbackInfo = null
  }

  public hasCallbackInfo (): boolean {
    return this._callbackInfo !== null
  }

  public setCallbackInfo (cbInfo: ICallbackInfo | null) {
    this._callbackInfo = cbInfo
  }

  public getCallbackInfo (): ICallbackInfo | null {
    return this._callbackInfo
  }

  public add<V> (value: V): Handle<V> {
    const h = this.handleStore.push(value)
    this.end++
    return h
  }

  public addExternal (data: void_p): Handle<object> {
    return this.add(new External(data))
  }

  public dispose (): void {
    if (this._escapeCalled) this._escapeCalled = false
    if (this.start === this.end) return
    this.handleStore.erase(this.start, this.end)
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
