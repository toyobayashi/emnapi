// The following forms are copied from actual emnapi sources:
// function.ts, value/convert2napi.ts, wrap.ts, core/init.ts,
// core/async-work.ts, threadsafe-function.ts, string.ts, v8/number.ts,
// node.ts, value/convert2c.ts and v8/object.ts.
export function exerciseParseTools(argc, argv, argVal, cbinfoValue, words, wordIndex, propPtr, env, error_code, engine_reserved, tsfn, initial_thread_count, work, aw, data, outPtr, codeUnit, out, v, result, trigger_async_id, buf, i, getter_wrap, capacity) {
    argc >>>= 0;
    argv >>>= 0;
    var HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer), GET_HEAP_DATA_VIEW = () => HEAP_DATA_VIEW.buffer === emnapiPluginCtx.wasmMemory.buffer ? HEAP_DATA_VIEW : (HEAP_DATA_VIEW = new DataView(emnapiPluginCtx.wasmMemory.buffer));
    const argcValue = GET_HEAP_DATA_VIEW().getUint32(argc, true);
    argcValue >>>= 0;
    const argValue = GET_HEAP_DATA_VIEW().getUint32(argv + i * 4, true);
    const firstArg = GET_HEAP_DATA_VIEW().getUint32(argv + 4, true);
    GET_HEAP_DATA_VIEW().setUint32(argv + i * 4, argVal, true);
    GET_HEAP_DATA_VIEW().setUint32(argc, cbinfoValue.args.length, true);
    const low = GET_HEAP_DATA_VIEW().getUint32(words + wordIndex * 8, true);
    const high = GET_HEAP_DATA_VIEW().getUint32(words + (wordIndex * 8 + 4), true);
    GET_HEAP_DATA_VIEW().setUint32(words + i * 8, low, true);
    GET_HEAP_DATA_VIEW().setUint32(words + (i * 8 + 4), high, true);
    const attributes = GET_HEAP_DATA_VIEW().getInt32(propPtr + 24, true);
    const dataPointer = GET_HEAP_DATA_VIEW().getUint32(propPtr + 28, true);
    GET_HEAP_DATA_VIEW().setInt32(env + 60 /* NapiEnvOffset64.last_error_error_code */, error_code, true);
    GET_HEAP_DATA_VIEW().setUint32(env + 56 /* NapiEnvOffset64.last_error_engine_error_code */, engine_error_code, true);
    GET_HEAP_DATA_VIEW().setUint32(env + 32 /* NapiEnvOffset32.last_error_engine_reserved */, engine_reserved, true);
    GET_HEAP_DATA_VIEW().setUint32(metaPtr + 4, external_data, true);
    GET_HEAP_DATA_VIEW().setUint32(tsfn + emnapiTSFN.offset.thread_count, initial_thread_count, true);
    const resource = GET_HEAP_DATA_VIEW().getUint32(work + emnapiAWMT.offset.resource, true);
    GET_HEAP_DATA_VIEW().setUint32(aw + emnapiAWMT.offset.env, env, true);
    (emnapiPluginCtx.wasmTable.get(execute))(env, data);
    const getter = getter_wrap ? (emnapiPluginCtx.wasmTable.get(getter_wrap)) : undefined;
    const allocation = _malloc(capacity);
    allocation >>>= 0;
    _free(allocation);
    GET_HEAP_DATA_VIEW().setInt16(outPtr, codeUnit, true);
    GET_HEAP_DATA_VIEW().setBigInt64(out, BigInt(v), true);
    GET_HEAP_DATA_VIEW().setFloat64(result, trigger_async_id, true);
    GET_HEAP_DATA_VIEW().setUint8(buf + i, v, true);
    GET_HEAP_DATA_VIEW().setInt8(result, r ? 1 : 0, true);
    const lowAsync = GET_HEAP_DATA_VIEW().getInt32(async_context, true);
    const byte = GET_HEAP_DATA_VIEW().getUint8(buf, true);
    return Number(argcValue) + Number(argValue) + Number(firstArg) + Number(low) + Number(high) + Number(attributes) + Number(dataPointer) + Number(resource) + Number(allocation) + Number(lowAsync) + byte + Number(getter !== undefined);
}
