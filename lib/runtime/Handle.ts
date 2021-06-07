declare const __webpack_public_path__: any
declare const global: typeof globalThis

// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {

  const _global: typeof globalThis = (function () {
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
  })()

  export class HandleStore extends Store<Handle<any>> {
    public static ID_UNDEFINED: -2147483648 = -2147483648
    public static ID_NULL: -2147483647 = -2147483647
    public static ID_FALSE: -2147483646 = -2147483646
    public static ID_TRUE: -2147483645 = -2147483645
    public static ID_GLOBAL: -2147483644 = -2147483644
    public constructor (private readonly _env: napi_env) {
      super(-2147483643)

      this.set(HandleStore.ID_UNDEFINED, new Handle(this._env, HandleStore.ID_UNDEFINED, undefined))
      this.set(HandleStore.ID_NULL, new Handle(this._env, HandleStore.ID_NULL, null))
      this.set(HandleStore.ID_FALSE, new Handle(this._env, HandleStore.ID_FALSE, false))
      this.set(HandleStore.ID_TRUE, new Handle(this._env, HandleStore.ID_TRUE, true))
      this.set(HandleStore.ID_GLOBAL, new Handle(this._env, HandleStore.ID_GLOBAL, _global))
    }
  }

  export class Handle<S> implements IStoreValue {
    public static create<S> (env: napi_env, value: S): Handle<S> {
      const handle = new Handle(env, 0, value)
      envStore.get(env)!.handleStore.add(handle)
      return handle
    }

    public id: number
    public env: napi_env
    public nativeObject: Pointer<any> | null
    public value: S
    public external: boolean

    public constructor (env: napi_env, id: number, value: S) {
      this.env = env
      this.id = id
      this.nativeObject = null
      this.value = value
      this.external = false
    }

    public isEmpty (): boolean {
      return this.id === 0
    }

    public isNumber (): boolean {
      return !this.isEmpty() && typeof this.value === 'number'
    }

    public isBigInt (): boolean {
      return !this.isEmpty() && typeof this.value === 'bigint'
    }

    public isString (): boolean {
      return !this.isEmpty() && typeof this.value === 'string'
    }

    public isFunction (): boolean {
      return !this.isEmpty() && typeof this.value === 'function'
    }

    public isExternal (): boolean {
      return !this.isEmpty() && this.external
    }

    public isObject (): boolean {
      return !this.isEmpty() && typeof this.value === 'object' && this.value !== null
    }

    public isBoolean (): boolean {
      return !this.isEmpty() && typeof this.value === 'boolean'
    }

    public isUndefined (): boolean {
      return !this.isEmpty() && this.value === undefined
    }

    public isSymbol (): boolean {
      return !this.isEmpty() && typeof this.value === 'symbol'
    }

    public isNull (): boolean {
      return !this.isEmpty() && this.value === null
    }

    public dispose (): void {
      envStore.get(this.env)!.handleStore.remove(this.id)
    }
  }

}
