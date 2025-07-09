import { from64, makeDynCall } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_globalize_reference (isolate: Ptr, value: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue === undefined) return 0
  return emnapiCtx.createReference(undefined, jsValue, 1, ReferenceOwnership.kUserland as any).id
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_dispose_global (ref: Ptr): void {
  const refValue = emnapiCtx.getRef(ref)
  if (!refValue) return
  refValue.dispose()
}

/**
 * @__deps $emnapiCtx
 * @__sig vppppi
 */
export function _v8_make_weak (ref: Ptr, data: Ptr, callback: Ptr, weak_callback: Ptr, type: number): void {
  const refValue = emnapiCtx.getRef(ref)
  if (!refValue) return
  from64('callback')
  refValue.setWeakWithData(data, (data) => {
    let field0 = 0
    let field1 = 0
    if (type === 1) {
      const id = refValue.get(emnapiCtx)
      if (id) {
        const value = emnapiCtx.jsValueFromNapiValue(id)
        field0 = emnapiCtx.getInternalField(value, 0)
        field1 = emnapiCtx.getInternalField(value, 1)
        if ((typeof field0 !== 'number' && typeof field0 !== 'bigint') ||
            (typeof field1 !== 'number' && typeof field1 !== 'bigint')) {
          throw new Error('Internal field is not a number')
        }
      }
    }
    makeDynCall('vppipp', 'callback')(weak_callback, data, type, field0, field1)
  })
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_clear_weak (ref: Ptr): Ptr {
  const refValue = emnapiCtx.getRef(ref)
  if (!refValue) return 0
  refValue.clearWeak()
  return 0
}
