import { from64, makeDynCall } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_global_value_identity (value: Ptr): Ptr {
  return emnapiCtx.isolate.acquireGlobalValueIdentity(
    emnapiCtx.jsValueFromNapiValue(value)
  )
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_retain_global_value_identity (identity: Ptr): void {
  emnapiCtx.isolate.retainGlobalValueIdentity(identity)
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_release_global_value_identity (identity: Ptr): void {
  emnapiCtx.isolate.releaseGlobalValueIdentity(identity)
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_local_from_global_reference (ref: Ptr): Ptr {
  const reference = emnapiCtx.isolate.getRef(ref)
  if (reference === undefined) return 1
  const id = reference.slot()
  return id || 1
}

/**
 * @__deps $emnapiCtx
 * @__sig ppp
 */
export function _v8_globalize_reference (isolate: Ptr, value: Ptr): Ptr {
  const jsValue = emnapiCtx.jsValueFromNapiValue(value)
  if (jsValue === undefined) return 0
  return emnapiCtx.isolate.createReference(jsValue).id
}

/**
 * @__deps $emnapiCtx
 * @__sig ipp
 */
export function _v8_global_reference_equals (lhs: Ptr, rhs: Ptr): number {
  const left = emnapiCtx.isolate.getRef(lhs)
  const right = emnapiCtx.isolate.getRef(rhs)
  if (!left || !right) return 0
  return left.getSlot()?.deref() === right.getSlot()?.deref() ? 1 : 0
}

/**
 * @__deps $emnapiCtx
 * @__sig pp
 */
export function _v8_copy_global_reference (from: Ptr): Ptr {
  const ref = emnapiCtx.isolate.getRef(from)
  if (ref === undefined) return 0
  return ref.copy().id
}

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_move_global_reference (from: Ptr, to: Ptr): void {
  const refFrom = emnapiCtx.isolate.getRef(from)
  const refTo = emnapiCtx.isolate.getRef(to)
  if (refFrom === undefined || refTo === undefined) return
  refFrom.move(refTo)
}

/**
 * @__deps $emnapiCtx
 * @__sig vp
 */
export function _v8_dispose_global (ref: Ptr): void {
  emnapiCtx.isolate.removeRef(ref)
}

/**
 * @__deps $emnapiCtx
 * @__sig vppppi
 */
export function _v8_make_weak (ref: Ptr, data: Ptr, callback: Ptr, weak_callback: Ptr, type: number): void {
  const refValue = emnapiCtx.isolate.getRef(ref)
  if (!refValue) return
  from64('callback')
  refValue.setWeak(data, (data) => {
    let field0 = 0
    let field1 = 0
    if (type === 1) {
      const id = refValue.slot()
      if (id) {
        const value = emnapiCtx.jsValueFromNapiValue(id)
        field0 = emnapiCtx.isolate.getInternalField(value, 0)
        field1 = emnapiCtx.isolate.getInternalField(value, 1)
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
  const refValue = emnapiCtx.isolate.getRef(ref)
  if (!refValue) return 0
  refValue.clearWeak()
  return 0
}
