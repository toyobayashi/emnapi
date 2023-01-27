function __emnapi_get_filename (buf: char_p, len: int): int {
  if (!buf) {
    return lengthBytesUTF8(napiModule.filename)
  }
  return stringToUTF8(napiModule.filename, buf, len)
}

emnapiImplementInternal('_emnapi_get_filename', 'ipi', __emnapi_get_filename)
