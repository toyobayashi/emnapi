import { emnapiCtx } from 'emnapi:shared'
import { from64 } from 'emscripten:parse-tools'
import { emnapiString } from './string'

/** @__sig ippi */
export function _emnapi_get_filename (env: napi_env, buf: char_p, len: int): int {
  const envObject = emnapiCtx.getEnv(env)!
  const filename = (envObject as NodeEnv).filename
  if (!buf) {
    return emnapiString.lengthBytesUTF8(filename)
  }
  from64('buf')
  return emnapiString.stringToUTF8(filename, buf as number, len)
}
