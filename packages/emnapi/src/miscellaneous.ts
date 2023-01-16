function _emnapi_get_filename (buf: char_p, len: int): int {
  if (!buf) {
    return lengthBytesUTF8(emnapiModule.filename)
  }
  return stringToUTF8(emnapiModule.filename, buf, len)
}

emnapiImplement('_emnapi_get_filename', 'ipi', _emnapi_get_filename)
