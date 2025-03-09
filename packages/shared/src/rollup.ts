import type { InputPluginOption, InputOptions, RollupOptions, NullValue, ExternalOption } from 'rollup'
import ts from 'typescript'

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const rollupTypescript = require('@rollup/plugin-typescript').default as typeof import('@rollup/plugin-typescript').default
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default as typeof import('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default as typeof import('@rollup/plugin-replace').default
const transformPureClass = require('@tybys/ts-transform-pure-class').default as typeof import('@tybys/ts-transform-pure-class').default
const rollupTerser = require('@rollup/plugin-terser').default

export type Format = 'esm' | 'cjs' | 'umd' | 'esm-browser'

export interface Options extends Omit<InputOptions, 'external'> {
  outputName: string
  outputFile: string
  compilerOptions?: ts.CompilerOptions
  defines?: Record<string, any>
  external?: ExternalOption | ((source: string, importer: string | undefined, isResolved: boolean, format: Format) => boolean | NullValue)
}

interface CreateConfigOptions extends Options {
  format: Format
  minify?: boolean
}

function createConfig (options: CreateConfigOptions): RollupOptions {
  const {
    input,
    outputName,
    outputFile,
    compilerOptions,
    plugins,
    minify,
    format,
    defines,
    external,
    ...restInput
  } = options ?? {}
  const target = compilerOptions?.target ?? ts.ScriptTarget.ES2021

  const defaultPlugins: InputPluginOption[] = [
    rollupTypescript({
      compilerOptions: {
        ...(target !== ts.ScriptTarget.ES5 ? { removeComments: true, downlevelIteration: false } : {}),
        ...options?.compilerOptions
      },
      transformers: {
        after: [
          transformPureClass
        ]
      }
    }),
    rollupNodeResolve({
      mainFields: ['module', 'module-sync', 'import', 'main']
    }),
    rollupReplace({
      preventAssignment: true,
      values: {
        __FORMAT__: JSON.stringify(format),
        __DEV__: format === 'umd' || format === 'esm-browser' ? (minify ? 'false' : 'true') : '(process.env.NODE_ENV !== "production")',
        'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
        ...defines
      }
    }),
    ...(minify
      ? [
          rollupTerser.default({
            compress: true,
            mangle: true,
            format: {
              comments: false
            }
          })
        ]
      : [])
  ]

  const outputDir = 'dist'
  const outputs = {
    esm: {
      file: `${outputDir}/${outputFile}${minify ? '.min' : ''}.js`,
      format: 'esm',
      exports: 'named'
    } satisfies RollupOptions['output'],
    'esm-browser': {
      file: `${outputDir}/${outputFile}.browser${minify ? '.min' : ''}.js`,
      format: 'esm',
      exports: 'named'
    } satisfies RollupOptions['output'],
    cjs: {
      file: `${outputDir}/${outputFile}${minify ? '.min' : ''}.cjs`,
      format: 'cjs',
      exports: 'named'
    } satisfies RollupOptions['output'],
    umd: {
      file: `${outputDir}/${outputFile}.umd${minify ? '.min' : ''}.cjs`,
      format: 'umd',
      name: outputName,
      exports: 'named'
    } satisfies RollupOptions['output']
  }

  const defaultExternals: Record<CreateConfigOptions['format'], string[]> = {
    esm: ['tslib'],
    'esm-browser': [],
    cjs: ['tslib'],
    umd: []
  }

  return {
    input: input ?? 'src/index.ts',
    external: typeof external === 'function'
      ? function (this: any, id: string, parent, isResolved) {
        const result = external.call(this, id, parent, isResolved, format)
        if (result) return result
        return defaultExternals[format]?.includes(id)
      }
      : Array.isArray(external)
        ? [...new Set([...(defaultExternals[format] ?? []), ...external])]
        : defaultExternals[format],
    plugins: plugins instanceof Promise
      ? plugins.then(p => {
        return [...defaultPlugins, ...(Array.isArray(p) ? p : [p])]
      })
      : [...defaultPlugins, ...(Array.isArray(plugins) ? plugins : [plugins])],
    ...restInput,
    output: outputs[format]
  }
}

export function defineConfig (options: Options): RollupOptions[] {
  return ([
    ['esm', false],
    ['cjs', false],
    ['umd', false],
    ['umd', true],
    ['esm-browser', false],
    ['esm-browser', true]
  ] as const).map(([format, minify]) => createConfig({
    ...options,
    format,
    minify
  }))
}
