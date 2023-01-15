function _emnapi_get_filename_length (): int {
  return lengthBytesUTF8(emnapiModule.filename)
}

function _emnapi_get_filename (buf: char_p, len: int): int {
  return stringToUTF8(emnapiModule.filename, buf, len)
}

emnapiImplement('_emnapi_get_filename_length', 'i', _emnapi_get_filename_length)
emnapiImplement('_emnapi_get_filename', 'vpi', _emnapi_get_filename)
