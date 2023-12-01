import { EOL } from 'os'
import type { Plugin } from 'rollup'
import { transform } from '@emnapi/ts-transform-emscripten-esm-library'

export interface PluginOptions {
  defaultLibraryFuncsToInclude?: string[]
  exportedRuntimeMethods?: string[]
  modifyOutput?: (output: string) => string
}

export default function (options?: PluginOptions): Plugin {
  const defaultLibraryFuncsToInclude = options?.defaultLibraryFuncsToInclude ?? []
  const exportedRuntimeMethods = options?.exportedRuntimeMethods ?? []
  const defaultModify = <T>(_: T): T => _
  const modifyOutput = options?.modifyOutput ?? defaultModify

  return {
    name: 'ts-transform-emscriten',
    renderChunk: function (code, chunk) {
      const result = transform(chunk.fileName, code)

      const prefix = [
        ...defaultLibraryFuncsToInclude
          .map(sym => `{{{ ((DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("${sym}") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("${sym}") : undefined), "") }}}`),
        ...exportedRuntimeMethods
          .map(sym => `{{{ ((EXPORTED_RUNTIME_METHODS.indexOf("${sym}") === -1 ? EXPORTED_RUNTIME_METHODS.push("${sym}") : undefined), "") }}}`)
      ].join(EOL)

      return modifyOutput(prefix + (prefix ? EOL : '') + result.replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(elif)|(endif)))/g, '$1$2'))
    }
  }
}
