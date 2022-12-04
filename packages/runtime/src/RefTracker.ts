/** @internal */
export class RefTracker {
  /** @virtual */
  protected finalize (_isEnvTeardown: boolean): void {}

  private _next: RefTracker | null = null
  private _prev: RefTracker | null = null

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
      list._next.finalize(true)
    }
  }
}
