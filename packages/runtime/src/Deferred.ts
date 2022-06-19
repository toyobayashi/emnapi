import { deferredStore } from './DeferredStore'
import type { Env } from './env'
import type { IStoreValue } from './Store'

export interface IDeferrdValue<T = any> {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

export class Deferred<T = any> implements IStoreValue {
  public static create<T = any> (envObject: Env, value: IDeferrdValue<T>): Deferred {
    const deferred = new Deferred<T>(envObject, value)
    deferredStore.add(deferred)
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
    deferredStore.remove(this.id)
    this.id = 0
    this.value = null!
  }
}
