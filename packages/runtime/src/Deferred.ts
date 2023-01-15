import type { Context } from './Context'
import type { IStoreValue } from './Store'

export interface IDeferrdValue<T = any> {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

export class Deferred<T = any> implements IStoreValue {
  public static create<T = any> (ctx: Context, value: IDeferrdValue<T>): Deferred {
    const deferred = new Deferred<T>(ctx, value)
    ctx.deferredStore.add(deferred)
    return deferred
  }

  public id: number
  public ctx: Context
  public value: IDeferrdValue<T>

  public constructor (ctx: Context, value: IDeferrdValue<T>) {
    this.id = 0
    this.ctx = ctx
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
    this.ctx.deferredStore.remove(this.id)
    this.id = 0
    this.value = null!
    this.ctx = null!
  }
}
