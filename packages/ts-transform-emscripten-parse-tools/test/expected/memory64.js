import { wasmTable } from "emscripten:runtime";
import { wasmMemory } from "emscripten:runtime";
// The following forms are copied from actual emnapi sources:
// function.ts, value/convert2napi.ts, wrap.ts, core/init.ts,
// core/async-work.ts, threadsafe-function.ts, string.ts, v8/number.ts,
// node.ts, value/convert2c.ts and v8/object.ts.
export function exerciseParseTools(argc, argv, argVal, cbinfoValue, words, wordIndex, propPtr, env, error_code, engine_reserved, tsfn, initial_thread_count, work, aw, data, outPtr, codeUnit, out, v, result, trigger_async_id, buf, i, getter_wrap, capacity) {
    argc = Number(argc);
    argv = Number(argv);
    var HEAP_DATA_VIEW = new DataView(wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(wasmMemory.buffer));
    const argcValue = GET_HEAP_DATA_VIEW().getBigUint64(argc, true);
    argcValue = Number(argcValue);
    const argValue = GET_HEAP_DATA_VIEW().getBigUint64(argv + i * 8, true);
    const firstArg = GET_HEAP_DATA_VIEW().getBigUint64(argv + 8, true);
    GET_HEAP_DATA_VIEW().setBigUint64(argv + i * 8, BigInt(argVal), true);
    GET_HEAP_DATA_VIEW().setBigUint64(argc, BigInt(cbinfoValue.args.length), true);
    const low = GET_HEAP_DATA_VIEW().getUint32(words + wordIndex * 8, true);
    const high = GET_HEAP_DATA_VIEW().getUint32(words + (wordIndex * 8 + 4), true);
    GET_HEAP_DATA_VIEW().setUint32(words + i * 8, low, true);
    GET_HEAP_DATA_VIEW().setUint32(words + (i * 8 + 4), high, true);
    const attributes = GET_HEAP_DATA_VIEW().getBigInt64(propPtr + 48, true);
    const dataPointer = GET_HEAP_DATA_VIEW().getBigUint64(propPtr + 56, true);
    GET_HEAP_DATA_VIEW().setInt32(env + 60 /* NapiEnvOffset64.last_error_error_code */, error_code, true);
    GET_HEAP_DATA_VIEW().setUint32(env + 56 /* NapiEnvOffset64.last_error_engine_error_code */, engine_error_code, true);
    GET_HEAP_DATA_VIEW().setBigUint64(env + 32 /* NapiEnvOffset32.last_error_engine_reserved */, BigInt(engine_reserved), true);
    GET_HEAP_DATA_VIEW().setBigUint64(metaPtr + 8, BigInt(external_data), true);
    GET_HEAP_DATA_VIEW().setBigUint64(tsfn + emnapiTSFN.offset.thread_count, BigInt(initial_thread_count), true);
    const resource = GET_HEAP_DATA_VIEW().getBigUint64(work + emnapiAWMT.offset.resource, true);
    GET_HEAP_DATA_VIEW().setBigUint64(aw + emnapiAWMT.offset.env, BigInt(env), true);
    (wasmTable.get(Number(execute)))(env, data);
    const getter = getter_wrap ? (wasmTable.get(Number(getter_wrap))) : undefined;
    const allocation = _malloc(BigInt(capacity));
    allocation = Number(allocation);
    _free(BigInt(allocation));
    GET_HEAP_DATA_VIEW().setInt16(outPtr, codeUnit, true);
    GET_HEAP_DATA_VIEW().setBigInt64(out, BigInt(v), true);
    GET_HEAP_DATA_VIEW().setFloat64(result, trigger_async_id, true);
    GET_HEAP_DATA_VIEW().setUint8(buf + i, v, true);
    GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
    const lowAsync = GET_HEAP_DATA_VIEW().getInt32(async_context, true);
    const byte = GET_HEAP_DATA_VIEW().getUint8(buf, true);
    return Number(argcValue) + Number(argValue) + Number(firstArg) + Number(low) + Number(high) + Number(attributes) + Number(dataPointer) + Number(resource) + Number(allocation) + Number(lowAsync) + byte + Number(getter !== undefined);
}
