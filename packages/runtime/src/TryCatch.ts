import type { Isolate } from './Isolate'

export class TryCatch {
  public static top: TryCatch | null = null
  private static _map: Map<number | bigint, TryCatch> = new Map()

  public id: number | bigint = 0
  private _exception: any = undefined
  private _caught: boolean = false
  private _next: TryCatch | null = null

  public constructor (id: number | bigint) {
    this.id = id
    this._next = TryCatch.top
    TryCatch.top = this
    TryCatch._map.set(id, this)
  }

  public static deref (id: number | bigint) {
    return this._map.get(id)
  }

  public static pop (): void {
    const top = TryCatch.top
    if (top) {
      TryCatch._map.delete(top.id)
      TryCatch.top = top._next
      top._next = null
      top.id = 0
      top._exception = undefined
      top._caught = false
    }
  }

  public isEmpty (): boolean {
    return !this._caught
  }

  public hasCaught (): boolean {
    return this._caught
  }

  public exception (): any {
    return this._exception
  }

  public rethrow (ctx: Isolate) {
    if (this._caught) {
      const e = this.extractException()
      ctx.setLastException(e)
      return e
    }
    return undefined
  }

  public setError (err: any): void {
    this._caught = true
    this._exception = err
  }

  public reset (): void {
    this._caught = false
    this._exception = undefined
  }

  public extractException (): any {
    const e = this._exception
    this.reset()
    return e
  }
}
