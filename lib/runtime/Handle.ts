declare const __webpack_public_path__: any
declare const global: typeof globalThis

// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  // -2147483648 <= handleCount <= 2147483647 && handleCount !== 0
  let handleCount: number = -2147483642

  export class Handle<S> {
    public static store: { [id: number]: Handle<any> } = (function () {
      const store = Object.create(null)
      store[-2147483648] = new Handle(-2147483648, undefined)
      store[-2147483647] = new Handle(-2147483647, null)
      store[-2147483646] = new Handle(-2147483646, false)
      store[-2147483645] = new Handle(-2147483645, true)
      store[-2147483644] = new Handle(-2147483644, NaN)
      store[-2147483643] = new Handle(-2147483643, (function () {
        let g
        g = (function (this: any) { return this })()

        try {
          // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
          g = g || new Function('return this')()
        } catch (_) {
          if (typeof globalThis !== 'undefined') return globalThis
          if (typeof __webpack_public_path__ === 'undefined') {
            if (typeof global !== 'undefined') return global
          }
          if (typeof window !== 'undefined') return window
          if (typeof self !== 'undefined') return self
        }

        return g
      })())
      return store
    })()

    public static create<S> (value: S): Handle<S> {
      while (handleCount in Handle.store) {
        handleCount = (handleCount === 2147483647 ? -2147483642 : (handleCount + 1)) || 1
      }
      const h = new Handle(handleCount, value)
      Handle.store[handleCount] = h
      handleCount = (handleCount === 2147483647 ? -2147483642 : (handleCount + 1)) || 1
      return h
    }

    public id: number
    public nativeObject: Pointer<any> | null
    public value: S

    private constructor (id: number, value: S) {
      this.id = id
      this.nativeObject = null
      this.value = value
    }

    public isEmpty (): boolean {
      return (this.id === -1) || (!('value' in this))
    }

    public dispose (): void {
      if (this.id in Handle.store) {
        delete Handle.store[this.id]
      }
      this.id = -1
      delete (this as any).value
    }
  }

}
