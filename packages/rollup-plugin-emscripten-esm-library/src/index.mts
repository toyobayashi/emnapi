import type { Plugin, ExternalOption } from 'rollup'
import { transformWithOptions, getDefaultOptions as getDefaultOptionsBase, type TransformOptions } from '@emnapi/ts-transform-emscripten-esm-library'

export interface PluginOptions extends TransformOptions {
  /** @default _ => _ */
  modifyOutput?: (output: string) => string
}

export function getDefaultOptions (options?: PluginOptions): Required<PluginOptions> {
  return {
    ...getDefaultOptionsBase(options),
    modifyOutput: options?.modifyOutput ?? ((_) => _)
  }
}

export default function (options?: PluginOptions): Plugin {
  const {
    modifyOutput,
    runtimeModuleSpecifier,
    parseToolsModuleSpecifier
  } = getDefaultOptions(options)

  const addExternal = (originalExternal: ExternalOption | undefined, sp: string): ExternalOption => {
    if (originalExternal == null) {
      return [sp]
    } else if (typeof originalExternal === 'string' || originalExternal instanceof RegExp) {
      return [originalExternal, sp]
    } else if (Array.isArray(originalExternal)) {
      return [...originalExternal, sp]
    } else if (typeof originalExternal === 'function') {
      return ((id, ...args) => {
        if (id === sp) {
          return true
        }
        return originalExternal(id, ...args)
      }) satisfies ExternalOption
    }
    throw new TypeError('Invalid external option')
  }

  return {
    name: '@emnapi/rollup-plugin-emscripten-esm-library',
    options (options) {
      let external = options.external
      if (runtimeModuleSpecifier) {
        external = addExternal(external, runtimeModuleSpecifier)
      }
      if (parseToolsModuleSpecifier) {
        external = addExternal(external, parseToolsModuleSpecifier)
      }

      return {
        ...options,
        external
      }
    },
    renderChunk: function (code, chunk) {
      return modifyOutput(transformWithOptions(chunk.fileName, code, options))
    }
  }
}
