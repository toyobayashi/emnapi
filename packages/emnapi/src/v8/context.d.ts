declare var emnapiString: {
  UTF8ToString (ptr: number, length: int): string
}
declare var emnapiCtx: Context
declare function emnapiGetHandle (value: napi_value): { status: napi_status; value?: any }
