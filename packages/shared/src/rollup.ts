import type { InputPluginOption, InputOptions, RollupOptions, NullValue, ExternalOption, Plugin, OutputOptions } from 'rollup'
import ts from 'typescript'
import path from 'path'
import fs from 'fs'
import {
  Extractor,
  ExtractorConfig,
  type IConfigFile,
  type ExtractorResult
} from '@microsoft/api-extractor'
import { PackageJsonLookup } from '@rushstack/node-core-library'
import MagicString from 'magic-string'

import { createRequire } from 'module'
import { EOL } from 'os'
const require = createRequire(import.meta.url)

const rollupTypescript = require('@rollup/plugin-typescript').default as typeof import('@rollup/plugin-typescript').default
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default as typeof import('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default as typeof import('@rollup/plugin-replace').default
const transformPureClass = require('@tybys/ts-transform-pure-class').default as typeof import('@tybys/ts-transform-pure-class').default
const rollupTerser = require('@rollup/plugin-terser').default

interface RollupApiExtractorOptions {
  configObject?: IConfigFile
  callback?: (result: ExtractorResult) => any
}

function rollupApiExtractor (options?: RollupApiExtractorOptions): Plugin {
  const { callback, configObject } = options ?? {}
  return {
    name: 'rollup-plugin-api-extractor',
    async writeBundle (outputOptions) {
      const configObjectFullPath = path.resolve('api-extractor.json')
      if (!fs.existsSync(configObjectFullPath)) return
      const configFromConfigFile = ExtractorConfig.loadFile(configObjectFullPath)
      const config = {
        ...configFromConfigFile,
        ...configObject,
        dtsRollup: {
          ...configFromConfigFile.dtsRollup,
          enabled: true,
          untrimmedFilePath: '',
          publicTrimmedFilePath: outputOptions.file?.replace(/\.cjs$/, '.d.cts').replace(/\.js$/, '.d.ts'),
          ...configObject?.dtsRollup
        }
      }
      const packageJsonLookup = new PackageJsonLookup()
      const packageJsonFullPath = packageJsonLookup.tryGetPackageJsonFilePathFor(configObjectFullPath)
      const extractorConfig = ExtractorConfig.prepare({
        configObject: config,
        configObjectFullPath,
        packageJsonFullPath
      })
      const extractorResult = Extractor.invoke(extractorConfig, {
        localBuild: true,
        showVerboseMessages: true
      })
      if (typeof callback === 'function') {
        await Promise.resolve(callback(extractorResult))
      }
    }
  }
}

export type Format = 'esm' | 'cjs' | 'umd' | 'esm-browser' | 'iife'

export interface MakeConfigOptions extends Omit<InputOptions, 'external'> {
  outputName: string
  outputFile: string
  outputExports?: OutputOptions['exports']
  format: Format
  sourcemap?: boolean | 'inline' | 'hidden'
  minify?: boolean
  compilerOptions?: ts.CompilerOptions
  defines?: Record<string, any>
  external?: ExternalOption | ((source: string, importer: string | undefined, isResolved: boolean, format: Format) => boolean | NullValue)
  apiExtractorCallback?: (result: ExtractorResult, format: Format) => any
  dtsEntry?: string
}

export interface Options extends Omit<MakeConfigOptions, 'format' | 'minify'> {
  browser?: boolean
  cjs?: boolean
  umd?: boolean
}

export function rollupRegion (): Plugin {
  const pkgLookup = new PackageJsonLookup()
  return {
    name: 'rollup-plugin-region',
    transform (code, id) {
      const pkgRoot = path.dirname(pkgLookup.tryGetPackageJsonFilePathFor(id) ?? process.cwd())
      const relativePath = path.relative(pkgRoot, id)

      const regionBanner = `//#region ${relativePath}${EOL}`
      const regionFooter = `${EOL}//#endregion ${relativePath}`
      const ms = new MagicString(code)
      ms.prepend(regionBanner)
      ms.append(regionFooter)
      return { code: ms.toString(), map: ms.generateMap({ hires: true }) }
    }
  }
}

export function makeConfig (options: MakeConfigOptions): RollupOptions {
  const {
    input,
    outputName,
    outputFile,
    outputExports = 'named',
    compilerOptions,
    plugins,
    minify = false,
    format,
    defines,
    external,
    sourcemap,
    apiExtractorCallback,
    dtsEntry = 'dist/types/index.d.ts',
    ...restInput
  } = options ?? {}
  const target = compilerOptions?.target ?? ts.ScriptTarget.ES2021

  const defaultPlugins: InputPluginOption[] = [
    rollupRegion(),
    rollupTypescript({
      tslib: require.resolve('tslib'),
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
    ...(minify || format === 'esm-browser' || format === 'iife'
      ? []
      : [
          rollupApiExtractor({
            configObject: {
              mainEntryPointFilePath: dtsEntry
            },
            callback (result) {
              if (result.succeeded) {
                if (format === 'umd') {
                  fs.appendFileSync(result.extractorConfig.publicTrimmedFilePath, '\nexport as namespace ' + outputName)
                }
                apiExtractorCallback?.(result, format)
              } else {
                if (typeof apiExtractorCallback === 'function') {
                  apiExtractorCallback(result, format)
                  return
                }
                const errmsg = `API Extractor completed with ${result.errorCount} errors and ${result.warningCount} warnings`
                throw new Error(errmsg)
              }
            }
          })
        ]
    ),
    rollupNodeResolve({
      mainFields: ['module', 'module-sync', 'import', 'main']
    }),
    rollupReplace({
      preventAssignment: true,
      values: {
        __FORMAT__: JSON.stringify(format),
        __DEV__: format === 'umd' || format === 'esm-browser' ? (minify ? 'false' : 'true') : '(process.env.NODE_ENV !== "production")',
        ...(format === 'umd' || format === 'esm-browser' ? { 'process.env.NODE_ENV': minify ? '"production"' : '"development"' } : {}),
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
      exports: outputExports,
      sourcemap
    } satisfies RollupOptions['output'],
    'esm-browser': {
      file: `${outputDir}/${outputFile}.browser${minify ? '.min' : ''}.js`,
      format: 'esm',
      exports: outputExports,
      sourcemap
    } satisfies RollupOptions['output'],
    cjs: {
      file: `${outputDir}/${outputFile}${minify ? '.min' : ''}.cjs`,
      format: 'cjs',
      exports: outputExports,
      sourcemap
    } satisfies RollupOptions['output'],
    umd: {
      file: `${outputDir}/${outputFile}.umd${minify ? '.min' : ''}.cjs`,
      format: 'umd',
      name: outputName,
      exports: outputExports,
      // sourcemap
    } satisfies RollupOptions['output'],
    iife: {
      file: `${outputDir}/${outputFile}.iife${minify ? '.min' : ''}.cjs`,
      format: 'iife',
      name: outputName,
      exports: outputExports,
      // sourcemap
    } satisfies RollupOptions['output']
  }

  const defaultExternals: Record<MakeConfigOptions['format'], string[]> = {
    esm: ['tslib'],
    'esm-browser': [],
    cjs: ['tslib'],
    umd: [],
    iife: []
  }

  const defaultCjsEntry = './src/index.cts'
  const defaultEsmEntry = './src/index.ts'

  return {
    input: input ?? ((format === 'cjs' || format === 'umd') ? (fs.existsSync(path.resolve(defaultCjsEntry)) ? defaultCjsEntry : defaultEsmEntry) : defaultEsmEntry),
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
  const { browser = false, cjs = false, umd = false, ...restOptions } = options
  return ([
    ['esm', false],
    ...(cjs ? [['cjs', false]] as const : []),
    ...(umd ? [['umd', false], ['umd', true]] as const : []),
    ...(browser ? [['esm-browser', false], ['esm-browser', true]] as const : [])
  ] as const).map(([format, minify], index) => makeConfig({
    ...restOptions,
    ...(index === 0
      ? {
          compilerOptions: {
            declaration: true,
            declarationMap: true,
            declarationDir: 'dist/types',
            emitDeclarationOnly: true,
            ...restOptions.compilerOptions
          }
        }
      : {}),
    format,
    minify
  }))
}
