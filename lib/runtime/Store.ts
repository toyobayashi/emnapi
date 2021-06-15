// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {

  export interface IStoreValue {
    id: number
    dispose (): void
    [x: string]: any
  }

  export class Store<V extends IStoreValue> {
    protected readonly _values: { [id: number]: V }
    protected _min: number

    // -2147483648 <= _id <= 2147483647 && _id !== 0
    private _id: number

    public constructor (min = -2147483648) {
      this._values = Object.create(null)
      this._min = min
      this._id = min
    }

    private _nextId (): void {
      this._id = (this._id === 2147483647 ? this._min : (this._id + 1)) || 1
    }

    public add (value: V): void {
      while (this._id in this._values) {
        this._nextId()
      }
      value.id = this._id
      this._values[this._id] = value
      this._nextId()
    }

    public get (id: number): V | undefined {
      return this._values[id]
    }

    protected set (id: number, value: V): void {
      this._values[id] = value
    }

    public has (id: number): boolean {
      return id in this._values
    }

    public remove (id: number): void {
      if (id in this._values) {
        this._values[id].id = 0
        delete this._values[id]
      }
    }

    public forEach (fn: (this: any, value: V, id: number, store: Store<V>) => void, thisArg?: any): void {
      Object.keys(this._values).forEach((value) => {
        const _id = Number(value)
        fn.call(thisArg, this._values[_id], _id, this)
      })
    }

    public allId (): number[] {
      return Object.keys(this._values).map(Number)
    }

    public dispose (): void {
      Object.keys(this._values).forEach((k) => {
        try {
          this._values[k as any].dispose()
        } catch (_) {}
        delete this._values[k as any]
      })
    }
  }

}
