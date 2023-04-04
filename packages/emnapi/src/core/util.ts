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
function emnapiImplementHelper (_name: string, _sig: string | undefined, compilerTimeFunction: Function, _deps?: string[], exportName?: string): void {
  if (exportName) {
    napiModule.emnapi[exportName] = compilerTimeFunction
  }
}

function emnapiDefineVar (_name: string, _value: any, _deps?: string[], postset?: string): void {
  if (typeof postset === 'function') {
    (postset as () => void)()
  }
}
