import './macros';
// Call forms copied from packages/emnapi/src/script.ts.
export function runScript(env, script, result) {
    let status;
    if (!env)
        return 1 /* napi_status.napi_invalid_arg */;
    // @ts-expect-error
    const envObject = emnapiEnv;
    envObject.checkGCAccess();
    if (!envObject.lastException.isEmpty())
        return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
    if (!envObject.canCallIntoJs())
        return envObject.setLastError(envObject.moduleApiVersion >= 10 ? 23 /* napi_status.napi_cannot_run_js */ : 10 /* napi_status.napi_pending_exception */);
    envObject.clearLastError();
    try {
        if (!script)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        if (!result)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
        status = (0 /* napi_status.napi_ok */);
    }
    catch (err) {
        envObject.lastException.resetTo(err);
        return envObject.setLastError(10 /* napi_status.napi_pending_exception */);
    }
    return status;
}
// The destructuring initializer and macro arguments follow packages/emnapi/src/string.ts.
export function checkStringArgs(env, str, length, result) {
    if (!env)
        return 1 /* napi_status.napi_invalid_arg */;
    // @ts-expect-error
    const envObject = emnapiEnv;
    envObject.checkGCAccess();
    const autoLength = length === -1 || length === 4294967295;
    const sizelength = length >>> 0;
    if (length !== 0) {
        if (!str)
            return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
    }
    if (!result)
        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
    if (!(autoLength || (sizelength <= 2147483647)))
        return envObject.setLastError(1 /* napi_status.napi_invalid_arg */);
    return autoLength ? sizelength : envObject.clearLastError();
}
// This direct call (without !) is from packages/emnapi/src/value/create.ts.
export function checkPropertyName(envObject, name_value) {
    if (!(typeof name_value === "string" || typeof name_value === "symbol"))
        return envObject.setLastError(4 /* napi_status.napi_name_expected */);
    return (0 /* napi_status.napi_ok */);
}
// These variable and statement forms are used throughout emnapi/src.
export function checkEnvironment(env) {
    if (!env)
        return 1 /* napi_status.napi_invalid_arg */;
    if (!env)
        return 1 /* napi_status.napi_invalid_arg */;
    // @ts-expect-error
    const envObject = emnapiEnv;
    envObject.checkGCAccess();
    return envObject.clearLastError();
}
// This unannotated dollar helper follows packages/emnapi/src/emnapi.ts; it must survive macro removal.
export function $emnapiGetMemoryAddress(arrayBufferOrView) {
    const isArrayBuffer = arrayBufferOrView instanceof ArrayBuffer;
    const isDataView = arrayBufferOrView instanceof DataView;
    const isTypedArray = ArrayBuffer.isView(arrayBufferOrView) && !isDataView;
    if (!isArrayBuffer && !isTypedArray && !isDataView && !emnapiExternalMemory.isSharedArrayBuffer(arrayBufferOrView)) {
        throw new TypeError('emnapiGetMemoryAddress expect ArrayBuffer or ArrayBufferView as first parameter');
    }
    let info;
    if (isArrayBuffer) {
        info = emnapiExternalMemory.getArrayBufferPointer(arrayBufferOrView, false);
    }
    else {
        info = emnapiExternalMemory.getViewPointer(arrayBufferOrView, false);
    }
    return {
        address: info.address,
        ownership: info.ownership,
        runtimeAllocated: info.runtimeAllocated
    };
}
