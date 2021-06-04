declare const __EMNAPI_RUNTIME_REPLACE__: any

mergeInto(LibraryManager.library, {
  // $emnapiInit: undefined,
  // $emnapiInit__deps: [
  //   '$ListNode',
  //   '$LinkedList',
  //   '$Handle',
  //   '$HandleScope',
  //   '$EscapableHandleScope',
  //   '$rootScope',
  //   '$scopeList'
  // ],
  // $emnapiInit__postset: `
  // ListNode();
  // LinkedList();
  // Handle();
  // HandleScope();
  // EscapableHandleScope();
  // rootScope();
  // scopeList();
  // `

  $emnapi: undefined,
  $emnapi__postset: __EMNAPI_RUNTIME_REPLACE__
})
