// Real layout names and offsets from packages/emnapi/src/typings/struct-wasm*.d.ts.
declare const enum NapiEnvOffset64 {
  last_error_error_code = 60,
  last_error_engine_error_code = 56
}

declare const enum NapiEnvOffset32 {
  last_error_engine_reserved = 32
}

declare const emnapiTSFN: {
  offset: { thread_count: number }
}

declare const emnapiAWMT: {
  offset: { resource: number; env: number }
}

declare function _malloc (size: number | bigint): number
declare function _free (pointer: number | bigint): void
