/* eslint-disable @typescript-eslint/no-unused-vars */

function emnapiImplement (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  napiModule.imports.napi[name] = compilerTimeFunction
}

// emnapi_*
function emnapiImplement2 (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  napiModule.imports.emnapi[name] = compilerTimeFunction
}

const WebAssemblyFunction = (WebAssembly as any).Function

function emnapiImplement2Async (name: string, sig: string | undefined, compilerTimeFunction: Function, deps?: string[]): void {
  if (typeof WebAssemblyFunction === 'function') {
    const sig_ = sig!.split('')
    const handleType = (s: string): string => {
      switch (s) {
        case 'i': return 'i32'
        case 'j': return 'i64'
        case 'f': return 'f32'
        case 'd': return 'f64'
        case 'p': return 'i32'
        default: return 'i32'
      }
    }
    const parameterType = sig_.slice(1).map(handleType)
    const returnType = handleType(sig_[0])
    const parameters = parameterType.slice(0)
    parameters.unshift('externref')
    napiModule.imports.emnapi[name] = new WebAssemblyFunction(
      { parameters, results: returnType },
      compilerTimeFunction,
      { suspending: 'first' }
    )
  }
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
