function __emnapi_get_filename (buf: char_p, len: int): int {
  if (!buf) {
    return lengthBytesUTF8(emnapiModule.filename)
  }
  return stringToUTF8(emnapiModule.filename, buf, len)
}

emnapiImplementInternal('_emnapi_get_filename', 'ipi', __emnapi_get_filename)
