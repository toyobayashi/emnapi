/* eslint-disable @typescript-eslint/no-unused-vars */

function emnapiImplement (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  napiModule.imports.napi[name] = compilerTimeFunction
}

// emnapi_*
function emnapiImplement2 (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  napiModule.imports.emnapi[name] = compilerTimeFunction
}

// _emnapi_*
function emnapiImplementInternal (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  napiModule.imports.env[name] = compilerTimeFunction
}

// $emnapi*
function emnapiImplementHelper (...args: Parameters<typeof emnapiImplement>): void
function emnapiImplementHelper (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
}

function emnapiDefineVar (name: string, value: any, deps?: string[], postset?: string): void {
  if (typeof value === 'function' && postset) {
    value()
  } else if (typeof value === 'object' && value !== null && postset) {
    value.init()
  }
}
