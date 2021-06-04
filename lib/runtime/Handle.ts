declare const __webpack_public_path__: any
declare const global: typeof globalThis

// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {

  let handleCount: number = 0

  export class Handle<S> {
    public static store: { [id: number]: Handle<any> } = (function () {
      const store = Object.create(null)
      store[0xfffffffa] = new Handle(0xfffffffa, undefined)
      store[0xfffffffb] = new Handle(0xfffffffb, null)
      store[0xfffffffc] = new Handle(0xfffffffc, false)
      store[0xfffffffd] = new Handle(0xfffffffd, true)
      store[0xfffffffe] = new Handle(0xfffffffe, NaN)
      store[0xffffffff] = new Handle(0xffffffff, (function () {
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
        handleCount = (handleCount + 1) % 0xfffffffa
      }
      const h = new Handle(handleCount, value)
      Handle.store[handleCount] = h
      handleCount = (handleCount + 1) % 0xfffffffa
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
