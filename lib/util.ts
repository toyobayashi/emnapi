// eslint-disable-next-line @typescript-eslint/no-unused-vars
function emnapiImplement (name: string, compilerTimeFunction: Function, deps?: string[]): void {
  mergeInto(LibraryManager.library, {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapi']).concat(deps ?? [])
  })
}
