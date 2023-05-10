function __emnapi_get_filename (env: napi_env, buf: char_p, len: int): int {
  const envObject = emnapiCtx.envStore.get(env)!
  if (!buf) {
    return emnapiString.lengthBytesUTF8(envObject.filename)
  }
  return emnapiString.stringToUTF8(envObject.filename, buf, len)
}

emnapiImplementInternal('_emnapi_get_filename', 'ippi', __emnapi_get_filename, ['$emnapiString'])
