import { Disposable } from './Disaposable'
import { ArrayStore, type CountIdReuseAllocator, type StoreValue } from './Store'

export interface IDeferrdValue<T = any> {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

export class DeferredStore extends ArrayStore<Deferred, CountIdReuseAllocator> {}

export class Deferred<T = any> extends Disposable implements StoreValue {
  public static create<T = any> (store: DeferredStore, value: IDeferrdValue<T>): Deferred<T> {
    return store.alloc(Deferred<T>, store, value)
  }

  public id: number
  public store: DeferredStore
  public value: IDeferrdValue<T>

  public constructor (store: DeferredStore, value: IDeferrdValue<T>) {
    super()
    this.id = 0
    this.store = store
    this.value = value
  }

  public resolve (value: T): void {
    this.value.resolve(value)
    this.dispose()
  }

  public reject (reason?: any): void {
    this.value.reject(reason)
    this.dispose()
  }

  public dispose (): void {
    if (this.id === 0) return
    this.store.dealloc(this.id)
    this.id = 0
    this.value = null!
    this.store = null!
  }
}
