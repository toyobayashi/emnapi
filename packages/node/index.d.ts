export declare interface AsyncContext {
  asyncId: number
  triggerAsyncId: number
}

export declare function emitAsyncInit (resource: object, name: string, triggerAsyncId: number): AsyncContext
export declare function emitAsyncDestroy (asyncContext: AsyncContext): void
// export declare function openCallbackScope (resource: object, asyncContext: AsyncContext): bigint
// export declare function closeCallbackScope (callbackScope: bigint): void
export declare function makeCallback<P extends any[], T> (resource: object, cb: (...args: P) => T, argv: P, asyncContext: AsyncContext): T
