#!/usr/bin/env node

import path from 'path'
import fs from 'fs'
import ts from 'typescript'
import type { RollupOptions, RollupBuild, OutputOptions } from 'rollup'
import { loadConfigFile } from 'rollup/loadConfigFile'
import { pathToFileURL } from 'url'

export async function build (workspace: string): Promise<void> {
  const { compile } = await import('@tybys/tsapi')
  const { rollup } = await import('rollup')

  compile(path.resolve(workspace, 'tsconfig.json'), {
    optionsToExtend: {
      target: ts.ScriptTarget.ES2021,
      outDir: path.resolve(workspace, 'lib'),
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      declarationDir: path.resolve(workspace, 'lib/typings')
    }
  })

  const {
    Extractor,
    ExtractorConfig
  } = await import('@microsoft/api-extractor')
  const apiExtractorJsonPath = path.resolve(workspace, 'api-extractor.json')
  const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
  const extractorResult = Extractor.invoke(extractorConfig, {
    localBuild: true,
    showVerboseMessages: true
  })
  if (extractorResult.succeeded) {
    console.log('API Extractor completed successfully')
  } else {
    const errmsg = `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`
    throw new Error(errmsg)
  }

  const dts = extractorConfig.publicTrimmedFilePath

  const { options } = await loadConfigFile(path.resolve(workspace, 'rollup.config.js'), {})

  const runRollup = async (conf: RollupOptions): Promise<void> => {
    const bundle = await rollup(conf)

    const writeBundle = async (bundle: RollupBuild, output: OutputOptions): Promise<void> => {
      const writeOutput = await bundle.write(output ?? {})

      for (const file of writeOutput.output) {
        if (file.type === 'asset') {
          console.log(`[Asset] ${output.file ?? file.fileName}`)
        } else if (file.type === 'chunk') {
          console.log(`[Chunk] ${output.file ?? file.fileName}`)
        }
      }

      if (output?.file) {
        if (output.file.endsWith('.umd.cjs')) {
          const umdDts = output.file.replace(/\.cjs$/, '.d.cts')
          fs.copyFileSync(dts, umdDts)
          if (output.name) {
            fs.appendFileSync(umdDts, `\nexport as namespace ${output.name};\n`, 'utf8')
          }
        } else if (output.file.endsWith('.umd.min.cjs')) {
          // ignore
        } else if (output.file.endsWith('.cjs')) {
          const cjsDts = output.file.replace(/\.cjs$/, '.d.cts')
          fs.copyFileSync(dts, cjsDts)
        }
      }
    }

    if (Array.isArray(conf.output)) {
      await Promise.all(conf.output.map(o => writeBundle(bundle, o ?? {})))
    } else {
      await writeBundle(bundle, conf.output ?? {})
    }
  }

  await Promise.all(options.map(runRollup))
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build(process.argv[2] ?? process.cwd()).catch(err => {
    console.error(err)
    process.exit(1)
  })
}
