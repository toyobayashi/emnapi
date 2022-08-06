export interface IStoreValue {
  id: number
  dispose (): void
  [x: string]: any
}

/* class Node<T> {
  constructor (
    public value: T,
    public next: Node<any> | null = null
  ) {}
}

class Queue<T> {
  public head: Node<any> | null = null
  public tail: Node<any> | null = null

  public push (value: T): void {
    if (this.tail === null) {
      this.head = this.tail = new Node(value)
    } else {
      const node = new Node(value)
      this.tail.next = node
      this.tail = node
    }
  }

  public shift (): T | undefined {
    if (this.head === null) return undefined
    const head = this.head
    if (this.head === this.tail) {
      this.head = this.tail = null
    } else {
      this.head = this.head.next
    }
    const value = head.value
    head.next = null
    return value
  }

  public clear (): void {
    this.head = this.tail = null
  }
} */

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
