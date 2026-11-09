import {
  from64,
  to64,
  POINTER_SIZE,
  SIZE_TYPE,
  POINTER_WASM_TYPE,
  makeGetValue,
  makeSetValue,
  makeDynCall
} from 'emscripten:parse-tools'

// The following forms are copied from actual emnapi sources:
// function.ts, value/convert2napi.ts, wrap.ts, core/init.ts,
// core/async-work.ts, threadsafe-function.ts, string.ts, v8/number.ts,
// node.ts, value/convert2c.ts and v8/object.ts.
export function exerciseParseTools (
  argc: number,
  argv: number,
  argVal: number,
  cbinfoValue: any,
  words: number,
  wordIndex: number,
  propPtr: number,
  env: number,
  error_code: number,
  engine_reserved: number,
  tsfn: number,
  initial_thread_count: number,
  work: number,
  aw: number,
  data: number,
  outPtr: number,
  codeUnit: number,
  out: number,
  v: number,
  result: number,
  trigger_async_id: number,
  buf: number,
  i: number,
  getter_wrap: number,
  capacity: number
): number {
  from64('argc')
  from64('argv')
  const argcValue = makeGetValue('argc', 0, SIZE_TYPE)
  from64('argcValue')
  const argValue = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
  const firstArg = makeGetValue('argv', POINTER_SIZE, '*')
  makeSetValue('argv', 'i * ' + POINTER_SIZE, 'argVal', '*')
  makeSetValue('argc', 0, 'cbinfoValue.args.length', SIZE_TYPE)

  const low = makeGetValue('words', 'wordIndex * 8', 'u32')
  const high = makeGetValue('words', 'wordIndex * 8 + 4', 'u32')
  makeSetValue('words', 'i * 8', 'low', 'u32')
  makeSetValue('words', 'i * 8 + 4', 'high', 'u32')
  const attributes = makeGetValue('propPtr', POINTER_SIZE * 6, POINTER_WASM_TYPE)
  const dataPointer = makeGetValue('propPtr', POINTER_SIZE * 7, '*')
  makeSetValue('env', NapiEnvOffset64.last_error_error_code, 'error_code', 'i32')
  makeSetValue('env', NapiEnvOffset64.last_error_engine_error_code, 'engine_error_code', 'u32')
  makeSetValue('env', NapiEnvOffset32.last_error_engine_reserved, 'engine_reserved', '*')
  makeSetValue('metaPtr', POINTER_SIZE, 'external_data', '*')

  makeSetValue('tsfn', 'emnapiTSFN.offset.thread_count', 'initial_thread_count', SIZE_TYPE)
  const resource = makeGetValue('work', 'emnapiAWMT.offset.resource', '*')
  makeSetValue('aw', 'emnapiAWMT.offset.env', 'env', '*')
  makeDynCall('vpp', 'execute')(env, data)
  const getter = getter_wrap ? makeDynCall('pppp', 'getter_wrap') : undefined

  const allocation = _malloc(to64('capacity'))
  from64('allocation')
  _free(to64('allocation'))
  makeSetValue('outPtr', 0, 'codeUnit', 'i16')
  makeSetValue('out', 0, 'v', 'i64')
  makeSetValue('result', 0, 'trigger_async_id', 'double')
  makeSetValue('buf', 'i', 'v', 'u8')
  makeSetValue('result', 0, 'r ? 1 : 0', 'i8')
  const lowAsync = makeGetValue('async_context', 0, 'i32')
  const byte = makeGetValue('buf', 0, 'u8')

  return Number(argcValue) + Number(argValue) + Number(firstArg) + Number(low) + Number(high) + Number(attributes) + Number(dataPointer) + Number(resource) + Number(allocation) + Number(lowAsync) + byte + Number(getter !== undefined)
}
