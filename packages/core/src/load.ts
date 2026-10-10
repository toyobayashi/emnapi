import { type WASIInstance, WASIThreads } from '@emnapi/wasi-threads'
import { type InputType, load, loadSync } from './util'
import { createAddonModule } from './emnapi/index'
import type { AddonModule, CreateOptions, NapiModule } from './emnapi/index'

/** @public */
export interface LoadedSource extends WebAssembly.WebAssemblyInstantiatedSource {
  usedInstance: WebAssembly.Instance
}

/** @public */
export interface InstantiatedAddonSource extends LoadedSource {
  addonModule: AddonModule
}

/**
 * @public
 * @deprecated Use InstantiatedAddonSource instead. This type will be removed in 2.0.0-rc.
 */
export interface InstantiatedSource extends LoadedSource {
  /** @deprecated Use addonModule from instantiateAddon or instantiateAddonSync. */
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

function loadAddonModuleImpl<T> (
  loadFn: (wasmInput: InputType | Promise<InputType>, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>) => Promise<T>,
  userAddonModule: AddonModule | undefined,
  wasmInput: InputType | Promise<InputType>,
  options?: LoadOptions | InstantiateOptions,
  useLegacyPropertyName?: boolean
): Promise<InstantiatedAddonSource | InstantiatedSource>
function loadAddonModuleImpl<T> (
  loadFn: (wasmInput: InputType, importObject: WebAssembly.Imports, callback: LoadCallback<WebAssembly.WebAssemblyInstantiatedSource, T>) => T,
  userAddonModule: AddonModule | undefined,
  wasmInput: InputType,
  options?: LoadOptions | InstantiateOptions,
  useLegacyPropertyName?: boolean
): InstantiatedAddonSource | InstantiatedSource
function loadAddonModuleImpl (loadFn: Function, userAddonModule: AddonModule | undefined, wasmInput: InputType | Promise<InputType>, options?: any, useLegacyPropertyName = false): any {
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

  let addonModule: AddonModule
  const isLoad = typeof userAddonModule === 'object' && userAddonModule !== null
  if (isLoad) {
    if (userAddonModule.loaded) {
      throw new Error(`${useLegacyPropertyName ? 'napiModule' : 'addonModule'} has already loaded`)
    }
    addonModule = userAddonModule
  } else {
    addonModule = createAddonModule(options!)
  }

  const wasi = options!.wasi
  let wasiThreads: WASIThreads | undefined

  let importObject: WebAssembly.Imports = {
    env: addonModule.imports.env,
    napi: addonModule.imports.napi,
    emnapi: addonModule.imports.emnapi
  }

  if (wasi) {
    wasiThreads = new WASIThreads(
      addonModule.childThread
        ? {
            wasi,
            childThread: true,
            postMessage: addonModule.postMessage!
          }
        : {
            wasi,
            threadManager: addonModule.PThread,
            waitThreadStart: addonModule.waitThreadStart
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
      addonModule.PThread.setup(module, memory)
    }

    const emnapiInit = (): LoadedSource | InstantiatedAddonSource | InstantiatedSource => {
      if (beforeInit) {
        beforeInit({
          instance: originalInstance,
          module
        })
      }
      addonModule.init({
        instance,
        module,
        memory,
        table
      })

      const ret: LoadedSource | InstantiatedAddonSource | InstantiatedSource = {
        instance: originalInstance,
        module,
        usedInstance: instance
      }
      if (!isLoad) {
        if (useLegacyPropertyName) {
          (ret as InstantiatedSource).napiModule = addonModule
        } else {
          (ret as InstantiatedAddonSource).addonModule = addonModule
        }
      }
      return ret
    }

    if (addonModule.PThread.shouldPreloadWorkers()) {
      if (loadFn === loadCallback) {
        return addonModule.PThread.loadWasmModuleToAllWorkers().then(emnapiInit)
      }
      // A synchronous instantiate cannot wait for the pool, so start loading
      // every pool worker in the background and return now. The pool is usable
      // before it is ready: a worker queues a 'start' that arrives before its
      // instance exists and runs it once loaded (see handleAfterLoad and
      // _loaded in @emnapi/wasi-threads worker.ts). A worker whose load fails
      // while it is idle is terminated and a fresh, unloaded worker takes its
      // place, so the pool keeps its size; the next spawn loads that worker.
      // The workers are not ref()'d, so a Node.js process can still exit while
      // the loads are in flight (the pool workers are unref()'d when created).
      // This is the same on every environment: nothing here blocks, so a
      // browser main thread delivers the loads once it yields.
      const PThread = addonModule.PThread
      const workers = PThread.unusedWorkers.slice()
      for (let i = 0; i < workers.length; ++i) {
        const worker = workers[i]
        if (!worker.whenLoaded) {
          PThread.loadWasmModuleToWorker(worker).then(undefined, () => {})
        }
      }
    }

    return emnapiInit()
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
export function loadAddon (
  addonModule: AddonModule,
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options?: LoadOptions
): Promise<LoadedSource> {
  if (typeof addonModule !== 'object' || addonModule === null) {
    throw new TypeError('Invalid addonModule')
  }
  return loadAddonModuleImpl(loadCallback, addonModule, wasmInput, options)
}

/** @public */
export function loadAddonSync (
  addonModule: AddonModule,
  wasmInput: BufferSource | WebAssembly.Module,
  options?: LoadOptions
): LoadedSource {
  if (typeof addonModule !== 'object' || addonModule === null) {
    throw new TypeError('Invalid addonModule')
  }
  return loadAddonModuleImpl(loadSyncCallback, addonModule, wasmInput, options)
}

/**
 * @public
 * @deprecated Use loadAddon instead. This API will be removed in 2.0.0-rc.
 */
export function loadNapiModule (
  napiModule: NapiModule,
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options?: LoadOptions
): Promise<LoadedSource> {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadAddonModuleImpl(loadCallback, napiModule, wasmInput, options, true)
}

/**
 * @public
 * @deprecated Use loadAddonSync instead. This API will be removed in 2.0.0-rc.
 */
export function loadNapiModuleSync (
  napiModule: NapiModule,
  wasmInput: BufferSource | WebAssembly.Module,
  options?: LoadOptions
): LoadedSource {
  if (typeof napiModule !== 'object' || napiModule === null) {
    throw new TypeError('Invalid napiModule')
  }
  return loadAddonModuleImpl(loadSyncCallback, napiModule, wasmInput, options, true)
}

/** @public */
export function instantiateAddon (
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options: InstantiateOptions
): Promise<InstantiatedAddonSource> {
  return loadAddonModuleImpl(loadCallback, undefined, wasmInput, options) as Promise<InstantiatedAddonSource>
}

/** @public */
export function instantiateAddonSync (
  wasmInput: BufferSource | WebAssembly.Module,
  options: InstantiateOptions
): InstantiatedAddonSource {
  return loadAddonModuleImpl(loadSyncCallback, undefined, wasmInput, options) as InstantiatedAddonSource
}

/**
 * @public
 * @deprecated Use instantiateAddon instead. This API will be removed in 2.0.0-rc.
 */
export function instantiateNapiModule (
  /** Only support `BufferSource` or `WebAssembly.Module` on Node.js */
  wasmInput: InputType | Promise<InputType>,
  options: InstantiateOptions
): Promise<InstantiatedSource> {
  return loadAddonModuleImpl(loadCallback, undefined, wasmInput, options, true) as Promise<InstantiatedSource>
}

/**
 * @public
 * @deprecated Use instantiateAddonSync instead. This API will be removed in 2.0.0-rc.
 */
export function instantiateNapiModuleSync (
  wasmInput: BufferSource | WebAssembly.Module,
  options: InstantiateOptions
): InstantiatedSource {
  return loadAddonModuleImpl(loadSyncCallback, undefined, wasmInput, options, true) as InstantiatedSource
}
