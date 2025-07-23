import { from64, makeGetValue, POINTER_SIZE } from 'emscripten:parse-tools'

/**
 * @__deps $emnapiCtx
 * @__sig vpp
 */
export function _v8_function_set_name (fn: Ptr, name: Ptr): void {
  if (!emnapiCtx.features.setFunctionName) {
    return
  }
  const str = emnapiCtx.jsValueFromNapiValue(name)
  const func = emnapiCtx.jsValueFromNapiValue(fn)
  emnapiCtx.features.setFunctionName(func, str)
}

/**
 * @__deps $emnapiCtx
 * @__sig ppppp
 */
export function _v8_function_new_instance (fn: Ptr, ctx: Ptr, argc: number, argv: Ptr): Ptr {
  const Ctor = emnapiCtx.jsValueFromNapiValue(fn)
  from64('argv')

  let i: number
  let ret: any
  try {
    if (emnapiCtx.features.Reflect) {
      const argList = Array(argc)
      for (i = 0; i < argc; i++) {
        const argVal = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        argList[i] = emnapiCtx.jsValueFromNapiValue(argVal)!
      }
      ret = emnapiCtx.features.Reflect.construct(Ctor, argList, Ctor)
    } else {
      const args = Array(argc + 1) as [undefined, ...any[]]
      args[0] = undefined
      for (i = 0; i < argc; i++) {
        const argVal = makeGetValue('argv', 'i * ' + POINTER_SIZE, '*')
        args[i + 1] = emnapiCtx.jsValueFromNapiValue(argVal)!
      }
      const BoundCtor = Ctor.bind.apply(Ctor, args) as new () => any
      ret = new BoundCtor()
    }
  } catch (err) {
    emnapiCtx.isolate.throwException(err)
    return 1
  }

  return emnapiCtx.napiValueFromJsValue(ret)
}
