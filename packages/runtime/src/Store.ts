export interface IStoreValue {
  id: number
  dispose (): void
  [x: string]: any
}

export class Store<V extends IStoreValue> {
  protected readonly _values: Array<V | undefined>
  protected _freeList: number[]

  // -2147483648 <= _id <= 2147483647 && _id !== 0
  // private _id: number

  public constructor () {
    this._values = [undefined]
    this._freeList = []
  }

  public add (value: V): void {
    const id = this._freeList.length ? this._freeList.pop()! : this._values.length
    value.id = id
    this._values[id] = value
  }

  public get (id: number): V | undefined {
    return this._values[id]
  }

  protected set (id: number, value: V): void {
    this._values[id] = value
    value.id = id
  }

  public has (id: number): boolean {
    return this._values[id] !== undefined
  }

  public remove (id: number): void {
    const value = this._values[id]
    if (value) {
      value.id = 0
      this._values[id] = undefined
      this._freeList.push(id)
    }
  }

  // public forEach (fn: (this: any, value: V, id: number, store: Store<V>) => void, thisArg?: any): void {
  //   this._values.forEach((value, id) => {
  //     fn.call(thisArg, value, id, this)
  //   })
  // }

  // public allId (): number[] {
  //   return [...this._values.keys()]
  // }

  public dispose (): void {
    this._values.slice(1).forEach(value => {
      value?.dispose()
    })
    this._values.length = 1
  }
}
