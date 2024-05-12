import { type WASIInstance, WASIThreads } from '@emnapi/wasi-threads'
import { type InputType, load, loadSync } from './util'
import { createNapiModule } from './emnapi/index'
import type { CreateOptions, NapiModule } from './emnapi/index'

/** @public */
export interface LoadedSource extends WebAssembly.WebAssemblyInstantiatedSource {
  usedInstance: WebAssembly.Instance
}

/** @public */
export interface InstantiatedSource extends LoadedSource {
  napiModule: NapiModule
}

/** @public */
export interface LoadOptions {
  wasi?: WASIInstance
  overwriteImports?: (importObject: WebAssembly.Imports) => WebAssembly.Imports
  beforeInit?: (source: WebAssembly.WebAssemblyInstantiatedSource) => void
  getMemory?: (exports: WebAssembly.Exports) => WebAssembly.Memory
  getTable?: (exports: WebAssembly.Exports) => WebAssembly.Table
}

/** @public */
export declare type InstantiateOptions = CreateOptions & LoadOptions

function loadNapiModuleImpl<T> (
  loadFn: (wasmInput: InputType | Promise<InputType>, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>) => Promise<T>,
  userNapiModule: NapiModule | undefined,
  wasmInput: InputType | Promise<InputType>,
  options?: LoadOptions | InstantiateOptions
): Promise<InstantiatedSource>
function loadNapiModuleImpl<T> (
  loadFn: (wasmInput: InputType, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>) => T,
  userNapiModule: NapiModule | undefined,
  wasmInput: InputType,
  options?: LoadOptions | InstantiateOptions
): InstantiatedSource
function loadNapiModuleImpl (loadFn: Function, userNapiModule: NapiModule | undefined, wasmInput: InputType | Promise<InputType>, options?: any): any {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  options = options ?? {} as InstantiateOptions

  const getMemory = options!.getMemory
  const getTable = options!.getTable
  const beforeInit = options!.beforeInit
  if (getMemory != null && typeof getMemory !== 'function') {
    throw new TypeError('options.getMemory is not a function')
  }
  if (getTable != null && typeof getTable !== 'function') {
    throw new TypeError('options.getTable is not a function')
  }
  if (beforeInit != null && typeof beforeInit !== 'function') {
    throw new TypeError('options.beforeInit is not a function')
  }

  let napiModule: NapiModule
  const isLoad = typeof userNapiModule === 'object' && userNapiModule !== null
  if (isLoad) {
    if (userNapiModule.loaded) {
      throw new Error('napiModule has already loaded')
    }
    napiModule = userNapiModule
  } else {
    napiModule = createNapiModule(options!)
  }

  const wasi = options!.wasi
  let wasiThreads: WASIThreads | undefined

  let importObject: WebAssembly.Imports = {
    env: napiModule.imports.env,
    napi: napiModule.imports.napi,
    emnapi: napiModule.imports.emnapi
  }

  if (wasi) {
    wasiThreads = new WASIThreads(
      napiModule.childThread
        ? {
            wasi,
            childThread: true,
            postMessage: napiModule.postMessage!
          }
        : {
            wasi,
            threadManager: napiModule.PThread,
            waitThreadStart: napiModule.waitThreadStart
          }
    )

    Object.assign(
      importObject,
      typeof wasi.getImportObject === 'function'
        ? wasi.getImportObject()
        : { wasi_snapshot_preview1: wasi.wasiImport }
    )

    Object.assign(importObject, wasiThreads.getImportObject())
  }

  const overwriteImports = options!.overwriteImports
  if (typeof overwriteImports === 'function') {
    const newImportObject = overwriteImports(importObject)
    if (typeof newImportObject === 'object' && newImportObject !== null) {
      importObject = newImportObject
    }
  }

  return loadFn(wasmInput, importObject, (err: Error | null, source: WebAssembly.WebAssemblyInstantiatedSource) => {
    if (err) {
      throw err
    }

    const originalInstance = source.instance
    let instance = originalInstance
    const originalExports = originalInstance.exports

    const exportMemory = 'memory' in originalExports
    const importMemory = 'memory' in importObject.env
    const memory: WebAssembly.Memory = getMemory
      ? getMemory(originalExports)
      : exportMemory
        ? originalExports.memory as WebAssembly.Memory
        : importMemory
          ? importObject.env.memory as WebAssembly.Memory
          : undefined!
    if (!memory) {
      throw new Error('memory is neither exported nor imported')
    }
    const table = getTable ? getTable(originalExports) : originalExports.__indirect_function_table as WebAssembly.Table
    if (wasi && !exportMemory) {
      const exports = Object.create(null)
      Object.assign(exports, originalExports, { memory })
      instance = { exports }
    }
    const module = source.module

    if (wasi) {
      instance = wasiThreads!.initialize(instance, module, memory)
    } else {
      napiModule.PThread.setup(module, memory)
    }

    if (beforeInit) {
      beforeInit({
        instance: originalInstance,
        module
      })
    }

    napiModule.init({
      instance,
      module,
      memory,
      table
    })

    const ret: any = {
      instance: originalInstance,
      module,
      usedInstance: instance
    }
    if (!isLoad) {
      ret.napiModule = napiModule
    }
    return ret
  })
}

type LoadCallback<T, U> = {
  (err: null, source: T): U
  (err: Error): never
}

function loadCallback<T> (wasmInput: InputType | Promise<InputType>, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>): Promise<T> {
  return load(wasmInput, importObject).then((source) => {
    return callback(null, source)
  }, err => {
    return callback(err)
  })
}

function loadSyncCallback<T> (wasmInput: InputType, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>): T {
  let source: WebAssembly.WebAssemblyInstantiatedSource
  try {
    source = loadSync(wasmInput, importObject)
  } catch (err) {
    return callback(err)
  }
  return callback(null, source)
}

/** @public */
export function loadNapiModule (
  napiModule: NapiModule,
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options?: LoadOptions
): Promise<LoadedSource> {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadNapiModuleImpl(loadCallback, napiModule, wasmInput, options)
}

/** @public */
export function loadNapiModuleSync (
  napiModule: NapiModule,
  wasmInput: BufferSource | WebAssembly.Module,
  options?: LoadOptions
): LoadedSource {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadNapiModuleImpl(loadSyncCallback, napiModule, wasmInput, options)
}

/** @public */
export function instantiateNapiModule (
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options: InstantiateOptions
): Promise<InstantiatedSource> {
  return loadNapiModuleImpl(loadCallback, undefined, wasmInput, options)
}

/** @public */
export function instantiateNapiModuleSync (
  wasmInput: BufferSource | WebAssembly.Module,
  options: InstantiateOptions
): InstantiatedSource {
  return loadNapiModuleImpl(loadSyncCallback, undefined, wasmInput, options)
}
