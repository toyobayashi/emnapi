declare const __EMNAPI_RUNTIME_REPLACE__: string

mergeInto(LibraryManager.library, {
  $emnapi: undefined,
  $emnapi__postset: __EMNAPI_RUNTIME_REPLACE__
})
