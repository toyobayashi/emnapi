export abstract class Disposable implements globalThis.Disposable {
  /** @virtual */
  public abstract dispose (): void

  // @ts-expect-error
  public [Symbol.dispose] (): void
}

if (typeof Symbol.dispose === 'symbol') {
  Object.defineProperty(Disposable.prototype, Symbol.dispose, {
    value () {
      this.dispose()
    },
    writable: true,
    enumerable: false,
    configurable: true
  })
}
