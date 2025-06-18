declare var emnapiString: {
  UTF8ToString (ptr: number, length: int): string
  lengthBytesUTF8 (str: string): number
  stringToUTF8 (str: string, outPtr: number, maxBytesToWrite: number): number
}
declare var emnapiCtx: Context
declare function emnapiGetHandle (value: napi_value): { status: napi_status; value?: any }
