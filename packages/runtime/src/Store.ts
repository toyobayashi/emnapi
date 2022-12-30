import { construct } from './util'

/** @internal */
export interface IStoreValue {
  id: number
  dispose (): void
  [x: string]: any
}

/** @internal */
export interface IReusableStoreValue extends IStoreValue {
  init (...args: any[]): void
}

/** @internal */
export class Store<V extends IStoreValue> {
  protected _values: Array<V | undefined>
  private _freeList: number[]
  private _size: number

  public constructor (capacity: number) {
    this._values = [undefined]
    this._values.length = capacity
    this._size = 1
    this._freeList = []
  }

  public add (value: V): void {
    let id: number
    if (this._freeList.length) {
      id = this._freeList.shift()!
    } else {
      id = this._size
      this._size++
      const capacity = this._values.length
      if (id >= capacity) {
        this._values.length = Math.ceil(capacity * 1.5)
      }
    }
    value.id = id
    this._values[id] = value
  }

  public get (id: Ptr): V | undefined {
    return this._values[id as any]
  }

  public has (id: Ptr): boolean {
    return this._values[id as any] !== undefined
  }

  public remove (id: Ptr): void {
    const value = this._values[id as any]
    if (value) {
      value.id = 0
      this._values[id as any] = undefined
      this._freeList.push(Number(id))
    }
  }

  public dispose (): void {
    for (let i = 1; i < this._size; ++i) {
      const value = this._values[i]
      value?.dispose()
    }
    this._values = [undefined]
    this._size = 1
    this._freeList = []
  }
}

export class ReusableStackStore<C extends new (...args: any[]) => IReusableStoreValue> {
  protected _values: Array<IReusableStoreValue | undefined>
  protected _next: number
  private readonly _Ctor: C

  public constructor (Ctor: C) {
    this._values = [undefined]
    this._next = 1
    this._Ctor = Ctor
  }

  public push (...args: ConstructorParameters<C>): InstanceType<C>
  public push (): InstanceType<C> {
    const id = this._next
    this._next++

    let instance = this._values[id]
    if (instance != null) {
      instance.init.apply(instance, arguments as any)
    } else {
      instance = construct(this._Ctor, arguments, this._Ctor)
      this._values[id] = instance
    }
    instance!.id = id
    return instance as InstanceType<C>
  }

  public get (id: Ptr): InstanceType<C> | undefined {
    id = Number(id)
    if (id >= this._next) return undefined
    return this._values[id] as InstanceType<C>
  }

  public has (id: Ptr): boolean {
    return Number(id) < this._next
  }

  public pop (n: number = 1): number {
    let i = 0
    while (this._next > 1 && i < n) {
      this._values[this._next - 1]!.dispose()
      this._next--
      i++
    }
    return this._next
  }

  public dispose (): void {
    this.pop(this._next - 1)
    this._values.length = 1
    this._next = 1
  }
}
