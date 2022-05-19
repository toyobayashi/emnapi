export interface IStoreValue {
  id: number
  dispose (): void
  [x: string]: any
}

export class Store<V extends IStoreValue> {
  protected readonly _values: Map<number, V>
  protected _min: number

  // -2147483648 <= _id <= 2147483647 && _id !== 0
  private _id: number

  public constructor (min = -2147483648) {
    this._values = new Map<number, V>()
    this._min = min
    this._id = min
  }

  private _nextId (): void {
    this._id = (this._id === 2147483647 ? this._min : (this._id + 1)) || 1
  }

  public add (value: V): void {
    while (this._values.has(this._id)) {
      this._nextId()
    }
    value.id = this._id
    this._values.set(this._id, value)
    this._nextId()
  }

  public get (id: number): V | undefined {
    return this._values.get(id)
  }

  protected set (id: number, value: V): void {
    this._values.set(id, value)
    value.id = id
  }

  public has (id: number): boolean {
    return this._values.has(id)
  }

  public remove (id: number): void {
    const value = this._values.get(id)
    if (value) {
      value.id = 0
      this._values.delete(id)
    }
  }

  public forEach (fn: (this: any, value: V, id: number, store: Store<V>) => void, thisArg?: any): void {
    this._values.forEach((value, id) => {
      fn.call(thisArg, value, id, this)
    })
  }

  // public allId (): number[] {
  //   return [...this._values.keys()]
  // }

  public dispose (): void {
    this._values.forEach(value => {
      value.dispose()
    })
    this._values.clear()
  }
}
