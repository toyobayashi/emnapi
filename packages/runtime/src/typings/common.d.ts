declare type Ptr = number | bigint

declare interface IBuffer extends Uint8Array {}
declare interface BufferCtor {
  readonly prototype: IBuffer
  /** @deprecated */
  new (...args: any[]): IBuffer
  from: {
    (buffer: ArrayBufferLike): IBuffer
    (buffer: ArrayBufferLike, byteOffset: number, length: number): IBuffer
  }
  alloc: (size: number) => IBuffer
  isBuffer: (obj: unknown) => obj is IBuffer
}

declare const enum GlobalHandle {
  UNDEFINED = 1,
  NULL,
  FALSE,
  TRUE,
  GLOBAL
}

declare const enum ReferenceOwnership {
  kRuntime,
  kUserland
}

declare const enum Version {
  NODE_API_SUPPORTED_VERSION_MIN = 1,
  NODE_API_DEFAULT_MODULE_API_VERSION = 8,
  NODE_API_SUPPORTED_VERSION_MAX = 9,
  NAPI_VERSION_EXPERIMENTAL = 2147483647 // INT_MAX
}
