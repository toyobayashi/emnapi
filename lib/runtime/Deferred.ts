// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export interface IDeferrdValue<T = any> {
    resolve: (value: T) => void
    reject: (reason?: any) => void
  }

  export class Deferred<T = any> implements IStoreValue {
    public static create<T = any> (env: napi_env, value: IDeferrdValue<T>): Deferred {
      const deferred = new Deferred<T>(env, value)
      envStore.get(env)!.deferredStore.add(deferred)
      return deferred
    }

    public id: number
    public env: napi_env
    public value: IDeferrdValue<T>

    public constructor (env: napi_env, value: IDeferrdValue<T>) {
      this.id = 0
      this.env = env
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
      envStore.get(this.env)!.deferredStore.remove(this.id)
      this.id = 0
      this.value = null!
    }
  }

  export class DeferredStore extends Store<Deferred> {
    public constructor () {
      super()
    }
  }
}
