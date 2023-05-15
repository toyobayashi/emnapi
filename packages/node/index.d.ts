export declare interface AsyncContext {
  asyncId: number
  triggerAsyncId: number
}

export declare interface NapiResult<T> {
  status: number
  value: T
  error?: any
}

export declare namespace node {
  export function emitAsyncInit (resource: object, name: string, triggerAsyncId: number): AsyncContext
  export function emitAsyncDestroy (asyncContext: AsyncContext): void
  // export function openCallbackScope (resource: object, asyncContext: AsyncContext): bigint
  // export function closeCallbackScope (callbackScope: bigint): void
  export function makeCallback<P extends any[], T> (resource: object, cb: (...args: P) => T, argv: P, asyncContext: AsyncContext): T
}

export declare namespace napi {
  export function asyncInit (resource: object | undefined | null, name: string): NapiResult<bigint>
  export function asyncDestroy (asyncContextPointer: bigint): NapiResult<undefined>
  export function makeCallback<P extends any[], T> (
    asyncContextPointer: bigint,
    recv: any,
    func: (...args: P) => T,
    argv: P
  ): NapiResult<T>
  export function fatalError (location: string, message: string): void
  export function fatalException (err: any): void
}
