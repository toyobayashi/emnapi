import type { Plugin } from 'rollup'
import { transformWithOptions, type TransformOptions } from '@emnapi/ts-transform-emscripten-esm-library'

export interface PluginOptions extends TransformOptions {
  modifyOutput?: (output: string) => string
}

export default function (options?: PluginOptions): Plugin {
  const defaultModify = <T>(_: T): T => _
  const modifyOutput = options?.modifyOutput ?? defaultModify

  return {
    name: '@emnapi/rollup-plugin-emscripten-esm-library',
    renderChunk: function (code, chunk) {
      return modifyOutput(transformWithOptions(chunk.fileName, code, options))
    }
  }
}
