import { Disposable } from './Disaposable'
import { ArrayStore } from './Store'

export interface IDeferrdValue<T = any> {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

export class Deferred<T = any> extends Disposable {
  public static create<T = any> (store: ArrayStore<Deferred>, value: IDeferrdValue<T>): Deferred<T> {
    return new Deferred<T>(store, value)
  }

  public id: number
  public store: ArrayStore<Deferred>
  public value: IDeferrdValue<T>

  public constructor (store: ArrayStore<Deferred>, value: IDeferrdValue<T>) {
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
