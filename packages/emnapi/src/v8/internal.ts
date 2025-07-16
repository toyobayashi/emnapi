import { from64, makeDynCall } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_local_from_global_reference (ref: Ptr): Ptr {
  const reference = emnapiCtx.getRef(ref)
  if (reference === undefined) return 1
  const id = reference.get(emnapiCtx)
  return id || 1
}

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
 * @__sig pp
 */
export function _v8_copy_global_reference (from: Ptr): Ptr {
  const ref = emnapiCtx.getRef(from)
  if (ref === undefined) return 0
  return ref.copy().id
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_move_global_reference (from: Ptr, to: Ptr): void {
  const refFrom = emnapiCtx.getRef(from)
  const refTo = emnapiCtx.getRef(to)
  if (refFrom === undefined || refTo === undefined) return
  refFrom.move(refTo)
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
