/* eslint-disable @typescript-eslint/no-unused-vars */

function emnapiImplement (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  const sym: any = {
    [name]: compilerTimeFunction,
    [name + '__deps']: (['$emnapiInit']).concat(deps ?? [])
  }
  if (sig) {
    sym[name + '__sig'] = sig
  }
  mergeInto(LibraryManager.library, sym)
}

// emnapi_*
function emnapiImplement2 (...args: Parameters<typeof emnapiImplement>): void
function emnapiImplement2 (): void {
  return emnapiImplement.apply(null, arguments as any)
}

// _emnapi_*
function emnapiImplementInternal (...args: Parameters<typeof emnapiImplement>): void
function emnapiImplementInternal (): void {
  return emnapiImplement.apply(null, arguments as any)
}

// $emnapi*
function emnapiImplementHelper (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[], _exportName?: string): void {
  return emnapiImplement(name, sig, compilerTimeFunction, deps)
}

function emnapiDefineVar (name: string, value: any, deps?: string[], postset?: string): void {
  const obj = {
    [name]: value
  }
  if (deps) {
    obj[name + '__deps'] = deps
  }
  if (postset) {
    obj[name + '__postset'] = postset
  }
  mergeInto(LibraryManager.library, obj)
}
