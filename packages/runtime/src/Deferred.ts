import type { Env } from './env'
import type { IStoreValue } from './Store'

/** @internal */
export interface IDeferrdValue<T = any> {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

/** @internal */
export class Deferred<T = any> implements IStoreValue {
  public static create<T = any> (envObject: Env, value: IDeferrdValue<T>): Deferred {
    const deferred = new Deferred<T>(envObject, value)
    envObject.ctx.deferredStore.add(deferred)
    return deferred
  }

  public id: number
  public envObject: Env
  public value: IDeferrdValue<T>

  public constructor (envObject: Env, value: IDeferrdValue<T>) {
    this.id = 0
    this.envObject = envObject
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
    this.envObject.ctx.deferredStore.remove(this.id)
    this.id = 0
    this.value = null!
  }
}
