mergeInto(LibraryManager.library, {
  $emnapiInit: undefined,
  $emnapiInit__deps: [
    '$ListNode',
    '$LinkedList',
    '$Handle',
    '$HandleScope',
    '$EscapableHandleScope',
    '$rootScope',
    '$scopeList'
  ],
  $emnapiInit__postset: `
  ListNode();
  LinkedList();
  Handle();
  HandleScope();
  EscapableHandleScope();
  rootScope();
  scopeList();
  `
})
