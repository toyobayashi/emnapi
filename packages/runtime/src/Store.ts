import { Disposable } from './Disaposable'

export interface ReusableStoreValue extends Disposable {
  reuse (...args: any[]): void
}

export interface IdAllocator extends Disposable {
  aquire (): number
  release (id: number): void
}

export class CountIdAllocator extends Disposable implements IdAllocator {
  public next: number

  public constructor (initialNext = 1) {
    super()
    this.next = initialNext
  }

  /** @virtual */
  public aquire (): number {
    return this.next++
  }

  /** @virtual */
  public release (_: number): void {}

  /** @virtual */
  public dispose (): void {}
}

export class CountIdReuseAllocator extends CountIdAllocator implements IdAllocator {
  private _freeList: number[] = []

  public override aquire (): number {
    if (this._freeList.length) {
      return this._freeList.shift()!
    }
    return super.aquire()
  }

  public override release (id: number): void {
    this._freeList.push(id)
  }

  public override dispose (): void {
    this._freeList.length = 0
    super.dispose()
  }
}

export interface ObjectAllocator<T> extends Disposable {
  deref<R extends T = T> (id: number | bigint): R | undefined
  alloc<P extends any[]> (factory: (...args: P) => T, ...args: P): T
  dealloc (id: number | bigint): void
}

export class BaseArrayStore<T> extends Disposable implements ObjectAllocator<T> {
  protected _values: [undefined, ...(T | undefined)[]]

  public constructor (initialCapacity = 1) {
    super()
    this._values = Array(initialCapacity) as [undefined, ...(T | undefined)[]]
  }

  /** @virtual */
  public assign (id: number | bigint, value: T): T {
    this._values[id as number] = value
    return value
  }

  /** @virtual */
  public deref<R extends T = T> (id: number | bigint): R | undefined {
    return this._values[id as number] as R
  }

  /** @virtual */
  public alloc <P extends any[]> (factory: (...args: P) => T, ...args: P): T {
    return factory(...args)
  }

  /** @virtual */
  public dealloc (id: number | bigint): void {
    this._values[id as number] = undefined
  }

  /** @virtual */
  public dispose (): void {
    this._values.forEach((_, i) => this.dealloc(i))
  }
}

export class ArrayStore<T extends { id: number | bigint }> extends BaseArrayStore<T> {
  protected _allocator: IdAllocator

  public constructor (initialCapacity = 4) {
    super(initialCapacity)
    this._allocator = new CountIdReuseAllocator(1)
  }

  public insert (value: T): void {
    const id = this._allocator.aquire()
    while (id >= this._values.length) {
      const cap = this._values.length
      this._values.length = cap + (cap >> 1) + 16
    }
    value.id = id
    this._values[id as number] = value
  }

  /** @virtual */
  public override alloc<P extends any[]> (factory: (...args: P) => T, ...args: P): T {
    const value = factory(...args)
    this.insert(value)
    return value
  }

  /** @virtual */
  public override dealloc (id: number | bigint): void {
    this._allocator.release(id as number)
    super.dealloc(id)
  }
}
