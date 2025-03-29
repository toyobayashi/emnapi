import { Disposable } from './Disaposable'

export interface StoreValue extends Disposable {
  id: number | bigint
}

export interface ReusableStoreValue extends StoreValue {
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
  deref (id: number | bigint): T | undefined
  alloc<Ctor extends new (...args: any[]) => T> (Contructor: Ctor, ...args: ConstructorParameters<Ctor>): InstanceType<Ctor>
  dealloc (id: number | bigint): void
}

export abstract class Store<V extends StoreValue, A extends IdAllocator> extends Disposable implements ObjectAllocator<V> {
  protected readonly _allocator: A

  public constructor (allocator: A) {
    super()
    this._allocator = allocator
  }

  /** @virtual */
  protected abstract _get (id: number | bigint): V | undefined

  /** @virtual */
  protected abstract _set (id: number | bigint, value: V): void

  /** @virtual */
  protected abstract _delete (id: number | bigint): boolean

  /** @virtual */
  public deref <T extends V = V> (id: number | bigint): T | undefined {
    return this._get(id) as T
  }

  /** @virtual */
  public alloc<Ctor extends new (...args: any[]) => V> (Contructor: Ctor, ...args: ConstructorParameters<Ctor>): InstanceType<Ctor> {
    const value = new Contructor(...args) as InstanceType<Ctor>
    const id = this._allocator.aquire()
    this._set(id, value)
    return value
  }

  /** @virtual */
  public dealloc (id: number | bigint): void {
    if (this._delete(id)) {
      this._allocator.release(id as number)
    }
  }
}

export class ArrayStore<V extends StoreValue, A extends IdAllocator> extends Store<V, A> {
  protected _values: [undefined, ...(V | undefined)[]]

  public constructor (allocator: A, initialCapacity = 1) {
    super(allocator)
    this._values = Array(initialCapacity) as [undefined, ...(V | undefined)[]]
  }

  /** @virtual */
  protected _get (id: number | bigint): V | undefined {
    return this._values[id as number]
  }

  /** @virtual */
  protected _set (id: number | bigint, value: V): void {
    value.id = id
    this._values[id as number] = value
  }

  /** @virtual */
  protected _delete (id: number | bigint): boolean {
    this._values[id as number] = undefined
    return true
  }

  /** @virtual */
  public dispose (): void {
    this._values
      .filter((v) => v != null)
      .forEach((v) => this.dealloc(v!.id))
  }
}

export class ReusableArrayStore<V extends ReusableStoreValue> extends ArrayStore<V, CountIdAllocator> {
  public constructor (initialCapacity = 1) {
    super(new CountIdAllocator(initialCapacity), initialCapacity)
  }

  /** @virtual */
  protected _delete (id: number | bigint): boolean {
    this._values[id as number]!.dispose()
    return false
  }

  /** @virtual */
  public override alloc<Ctor extends new (...args: any[]) => V>(Contructor: Ctor, ...args: ConstructorParameters<Ctor>): InstanceType<Ctor> {
    const id = this._allocator.aquire()
    let value = this._values[id as number]! as InstanceType<Ctor>
    if (value) {
      value.reuse(...args)
    } else {
      value = new Contructor(...args) as InstanceType<Ctor>
      this._set(id, value)
    }
    return value
  }

  /** @virtual */
  public override dealloc (id: number | bigint): void {
    this._delete(id)
  }
}
