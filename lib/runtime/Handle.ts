// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export const is = Object.is || function is (x: any, y: any): boolean {
    // SameValue algorithm
    if (x === y) { // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      return x !== 0 || 1 / x === 1 / y
    } else {
      // Step 6.a: NaN == NaN
      // eslint-disable-next-line no-self-compare
      return x !== x && y !== y
    }
  }

  export class HandleStore extends Store<Handle<any>> {
    public static ID_UNDEFINED: -2147483648 = -2147483648
    public static ID_NULL: -2147483647 = -2147483647
    public static ID_FALSE: -2147483646 = -2147483646
    public static ID_TRUE: -2147483645 = -2147483645
    public static ID_GLOBAL: -2147483644 = -2147483644

    // js object -> Handle
    private _objWeakMap: WeakMap<object, Handle<object>>
    // js value in store -> Handle id
    private _map: Map<any, number>

    public constructor () {
      super(-2147483643)
      this._objWeakMap = new WeakMap()
      this._map = new Map()
    }

    public addGlobalConstants (env: napi_env): void {
      this.set(HandleStore.ID_UNDEFINED, new Handle(env, HandleStore.ID_UNDEFINED, undefined))
      Reference.create(env, HandleStore.ID_UNDEFINED, 1, false)
      this.set(HandleStore.ID_NULL, new Handle(env, HandleStore.ID_NULL, null))
      Reference.create(env, HandleStore.ID_NULL, 1, false)
      this.set(HandleStore.ID_FALSE, new Handle(env, HandleStore.ID_FALSE, false))
      Reference.create(env, HandleStore.ID_FALSE, 1, false)
      this.set(HandleStore.ID_TRUE, new Handle(env, HandleStore.ID_TRUE, true))
      Reference.create(env, HandleStore.ID_TRUE, 1, false)
      this.set(HandleStore.ID_GLOBAL, new Handle(env, HandleStore.ID_GLOBAL, _global))
      Reference.create(env, HandleStore.ID_GLOBAL, 1, false)
    }

    public override add (h: Handle<any>): void {
      super.add(h)
      this._map.set(h.value, h.id)
      if (isReferenceType(h.value)) {
        this._objWeakMap.set(h.value, h)
      }
    }

    public override remove (id: number): void {
      this._map.delete(this.get(id)!.value)
      super.remove(id)
    }

    public getHandleByValue (value: any): Handle<any> | null {
      const id = this._map.get(value)
      return id ? this.get(id)! : null
    }

    public getHandleByAliveObject (value: object): Handle<any> | null {
      return this._objWeakMap.get(value) ?? null
    }

    public dispose (): void {
      this._objWeakMap = null!
      this._map.clear()
      this._map = null!
      super.dispose()
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
    public value: S
    public inScope: IHandleScope | null
    public wrapped: number = 0 // wrapped Reference id
    public tag: [number, number, number, number] | null
    public refs: Reference[]

    public constructor (env: napi_env, id: number, value: S) {
      this.env = env
      this.id = id
      this.value = value
      this.inScope = null
      this.wrapped = 0
      this.tag = null
      this.refs = []
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
      return !this.isEmpty() && (this instanceof ExternalHandle)
    }

    public isObject (): boolean {
      return !this.isEmpty() && typeof this.value === 'object' && this.value !== null
    }

    public isArray (): boolean {
      return !this.isEmpty() && Array.isArray(this.value)
    }

    public isArrayBuffer (): boolean {
      return !this.isEmpty() && (this.value instanceof ArrayBuffer)
    }

    public isTypedArray (): boolean {
      return !this.isEmpty() && (ArrayBuffer.isView(this.value)) && !(this.value instanceof DataView)
    }

    public isDataView (): boolean {
      return !this.isEmpty() && (this.value instanceof DataView)
    }

    public isDate (): boolean {
      return !this.isEmpty() && (this.value instanceof Date)
    }

    public isPromise (): boolean {
      return !this.isEmpty() && (this.value instanceof Promise)
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

    public addRef (ref: Reference): void {
      if (this.refs.indexOf(ref) !== -1) {
        return
      }
      this.refs.push(ref)
    }

    public removeRef (ref: Reference): void {
      const index = this.refs.indexOf(ref)
      if (index !== -1) {
        this.refs.splice(index, 1)
      }
      this.tryDispose()
    }

    public isInHandleScope (): boolean {
      return this.inScope !== null
    }

    public tryDispose (): void {
      if (this.canDispose()) {
        this.dispose()
      }
    }

    public canDispose (): boolean {
      return ((this.refs.length === 0) || (!this.refs.some(ref => ref.refcount > 0))) && (!this.isInHandleScope())
    }

    public dispose (): void {
      if (this.id === 0) return
      const refs = this.refs.slice()
      for (let i = 0; i < refs.length; i++) {
        const ref = refs[i]
        ref.queueFinalizer()
      }
      const id = this.id
      envStore.get(this.env)!.handleStore.remove(id)
      this.refs.length = 0
      this.id = 0
      this.value = undefined!
    }
  }

  function External (this: any): void {
    Object.setPrototypeOf(this, null)
  }
  External.prototype = null as any

  export class ExternalHandle extends Handle<{}> {
    public static createExternal (env: napi_env, data: void_p = 0): ExternalHandle {
      const h = new ExternalHandle(env, data)
      envStore.get(env)!.handleStore.add(h)
      return h
    }

    private readonly _data: void_p

    public constructor (env: napi_env, data: void_p = 0) {
      super(env, 0, new (External as any)())
      this._data = data
    }

    public data (): void_p {
      return this._data
    }
  }
}
