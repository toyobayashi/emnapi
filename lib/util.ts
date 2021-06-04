function emnapiImplement (name: string, compilerTimeFunction: Function): void {
  mergeInto(LibraryManager.library, {
    [name]: compilerTimeFunction,
    [name + '__deps']: ['$emnapi']
  })
}
