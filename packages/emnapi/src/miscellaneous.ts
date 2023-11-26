import { emnapiCtx } from 'emnapi:shared'
import { emnapiString } from './string'

/** @__sig ippi */
export function _emnapi_get_filename (env: napi_env, buf: char_p, len: int): int {
  const envObject = emnapiCtx.envStore.get(env)!
  const filename = (envObject as NodeEnv).filename
  if (!buf) {
    return emnapiString.lengthBytesUTF8(filename)
  }
  return emnapiString.stringToUTF8(filename, buf, len)
}
