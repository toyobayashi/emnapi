import { Disposable } from './Disaposable'

export class RefTracker extends Disposable {
  /** @virtual */
  public dispose (): void {}

  /** @virtual */
  public finalize (): void {}

  protected _next: RefTracker | null = null
  protected _prev: RefTracker | null = null

  public link (list: RefTracker): void {
    this._prev = list
    this._next = list._next
    if (this._next !== null) {
      this._next._prev = this
    }
    list._next = this
  }

  public unlink (): void {
    if (this._prev !== null) {
      this._prev._next = this._next
    }
    if (this._next !== null) {
      this._next._prev = this._prev
    }
    this._prev = null
    this._next = null
  }

  public static finalizeAll (list: RefTracker): void {
    while (list._next !== null) {
      list._next.finalize()
    }
  }
}
