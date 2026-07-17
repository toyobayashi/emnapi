import childProcess from 'child_process'
import fs from 'fs-extra'
import os from 'os'
import path from 'path'

// Validates the packed `emnapi` npm package produced by `script/release.js`.
//
//   node ./script/test-release-package.js [--prepared] [--tarball <emnapi.tgz>]
//
// --prepared validates the existing release output without rebuilding (run
// `node ./script/release.js` before this validator); --tarball <file>
// validates a pre-built emnapi tarball (regression tests against published
// tarballs).
//
// Checks: 1. tarball-content-allowlist (exact lib/wasm32-wasip1* file set)
// 2. symbol-profile (each napi-rs archive keeps its intended composition)
// 3. import-module (env cleanup hooks import from module "napi" — the check
//    that would have caught the broken published emnapi@2.0.0-alpha.2)
// 4. version-equality  5. core-plugins-subpath

const __dirname = import.meta.dirname
const repoRoot = path.join(__dirname, '..')
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const exe = (name) => name + (process.platform === 'win32' ? '.exe' : '')

// exact `lib/wasm32-wasip1*` entries allowed in the packed emnapi tarball;
// keep in sync with EXPECTED_WASI_ARCHIVES in script/release.js
const EXPECTED_WASI_LIB_FILES = [
  'lib/wasm32-wasip1/libemnapi.a',
  'lib/wasm32-wasip1/libemnapi-basic-napi-rs.a',
  'lib/wasm32-wasip1-threads/libemnapi.a',
  'lib/wasm32-wasip1-threads/libemnapi-mt.a',
  'lib/wasm32-wasip1-threads/libemnapi-napi-rs-mt.a'
]

const NAPI_RS_ARCHIVES = [
  { target: 'wasm32-wasip1', archive: 'libemnapi-basic-napi-rs.a', mt: false },
  { target: 'wasm32-wasip1-threads', archive: 'libemnapi-napi-rs-mt.a', mt: true }
]

// symbols implemented by src/async_work.c + src/threadsafe_function.c: the
// full composition (-mt archive) defines them in C, the basic composition
// (plain archive) leaves them to the @emnapi/core plugin JS implementations
const THREADS_IMPL_SYMBOLS = [
  'napi_create_async_work',
  'napi_create_threadsafe_function',
  'napi_call_threadsafe_function'
]

// mimics how napi-rs consumes these archives: crates/napi declares the two env
// cleanup hooks under wasm import module "napi" while crates/sys declares every
// other napi_* symbol under the default module ("env"); the call to
// napi_add_async_cleanup_hook forces extraction of the archive member that
// references the hooks (async_cleanup_hook.c), and the async work / TSFN calls
// force extraction of async_work.c / threadsafe_function.c on the -mt archive.
// The externs use the real Node-API arities: the -mt archive DEFINES these
// symbols, and wasm-ld reports a function signature mismatch when a
// declaration disagrees with an in-archive definition (so dummy `(void)`
// externs are not an option here)
const PROBE_SOURCE = `typedef void (*probe_hook)(void *arg);
typedef void (*probe_async_hook)(void *handle, void *data);
__attribute__((__import_module__("napi")))
extern int napi_add_env_cleanup_hook(void *env, probe_hook fun, void *arg);
__attribute__((__import_module__("napi")))
extern int napi_remove_env_cleanup_hook(void *env, probe_hook fun, void *arg);
extern int napi_create_threadsafe_function(void *env, void *func, void *async_resource,
    void *async_resource_name, unsigned long max_queue_size, unsigned long initial_thread_count,
    void *thread_finalize_data, void *thread_finalize_cb, void *context, void *call_js_cb,
    void **result);
extern int napi_create_async_work(void *env, void *async_resource, void *async_resource_name,
    void *execute, void *complete, void *data, void **result);
extern int napi_add_async_cleanup_hook(void *env, probe_async_hook hook, void *arg, void **handle);
static void probe_cb(void *arg) { (void)arg; }
static void probe_async_cb(void *handle, void *data) { (void)handle; (void)data; }
__attribute__((export_name("probe")))
int probe(void) {
  void *handle = 0;
  void *tsfn = 0;
  void *work = 0;
  int r = napi_add_env_cleanup_hook(0, probe_cb, 0);
  r += napi_remove_env_cleanup_hook(0, probe_cb, 0);
  r += napi_create_threadsafe_function(0, 0, 0, 0, 1, 1, 0, 0, 0, 0, &tsfn);
  r += napi_create_async_work(0, 0, 0, 0, 0, 0, &work);
  r += napi_add_async_cleanup_hook(0, probe_async_cb, 0, &handle);
  return r;
}
`

// spawn.js either inherits stdio (spawn) or drops the captured stderr when the
// child fails (spawnSync); the validator needs both the captured output and
// the failing tool's stderr in the thrown error, so it uses its own wrapper
function run (command, args, options = {}) {
  console.log(`[test-release-package] ${command} ${args.join(' ')}`)
  const result = childProcess.spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    ...options
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(
      `command failed (exit ${result.status}): ${command} ${args.join(' ')}\n` +
      (result.stderr || '').trim()
    )
  }
  return result.stdout
}

function resolveWasiSdkPath () {
  let wasiSdkPath = process.env.WASI_SDK_PATH || process.env.LLVM_PATH
  if (!wasiSdkPath) {
    throw new Error('process.env.WASI_SDK_PATH is falsy value')
  }
  if (!path.isAbsolute(wasiSdkPath)) {
    wasiSdkPath = path.join(repoRoot, wasiSdkPath)
  }
  return wasiSdkPath
}

function packWorkspace (workspace, packDir) {
  const stdout = run(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', packDir, '-w', workspace])
  const [metadata] = JSON.parse(stdout)
  if (!metadata || !metadata.filename) {
    throw new Error(`npm pack did not return metadata for ${workspace}`)
  }
  return path.join(packDir, metadata.filename)
}

function listFiles (dir, prefix = '') {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...listFiles(path.join(dir, entry.name), `${prefix}${entry.name}/`))
    } else {
      files.push(`${prefix}${entry.name}`)
    }
  }
  return files
}

// check 1: the packed tarball ships exactly the allowlisted wasi archives
// (specifically: no libemnapi-basic-napi-rs-mt.a, which v1 used to ship)
function checkTarballAllowlist (packageDir) {
  const actual = listFiles(packageDir).filter((file) => file.startsWith('lib/wasm32-wasip1')).sort()
  const expected = [...EXPECTED_WASI_LIB_FILES].sort()
  const missing = expected.filter((file) => !actual.includes(file))
  const unexpected = actual.filter((file) => !expected.includes(file))
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      'lib/wasm32-wasip1* entries in the packed emnapi tarball do not match the allowlist\n' +
      `  missing: ${missing.join(', ') || '(none)'}\n` +
      `  unexpected: ${unexpected.join(', ') || '(none)'}`
    )
  }
}

function readSymbols (llvmNm, archivePath) {
  const defined = new Set()
  const undef = new Set()
  for (const line of run(llvmNm, ['--extern-only', archivePath]).split(/\r?\n/)) {
    const definedMatch = /^[0-9a-fA-F]+\s+[A-Za-z]\s+(\S+)$/.exec(line.trim())
    const undefMatch = /^[Uwv]\s+(\S+)$/.exec(line.trim())
    if (definedMatch) defined.add(definedMatch[1])
    else if (undefMatch) undef.add(undefMatch[1])
  }
  return { defined, undef }
}

// check 2: each napi-rs archive keeps its intended composition. The -mt
// archive ships the FULL composition — the C async work / TSFN implementation
// shared with the emscripten emnapi-mt archive — so it must DEFINE those
// symbols; the plain wasip1 archive keeps the basic composition (async work
// and TSFN are provided by the @emnapi/core plugin JS implementations, so
// those symbols must stay undefined) and is free of pthread/TLS machinery
function checkSymbolProfiles (packageDir, wasiSdkPath) {
  const llvmNm = path.join(wasiSdkPath, 'bin', exe('llvm-nm'))
  const problems = []
  for (const { target, archive, mt } of NAPI_RS_ARCHIVES) {
    const label = `lib/${target}/${archive}`
    const archivePath = path.join(packageDir, 'lib', target, archive)
    if (!fs.existsSync(archivePath)) {
      problems.push(`${label}: missing from the tarball`)
      continue
    }
    const { defined, undef } = readSymbols(llvmNm, archivePath)
    // the async cleanup hook C implementations (distinct from the two env
    // cleanup hook IMPORTS checked below) must ship in the archive
    for (const symbol of ['emnapi_create_env', 'emnapi_delete_env', 'napi_add_async_cleanup_hook', 'napi_remove_async_cleanup_hook']) {
      if (!defined.has(symbol)) problems.push(`${label}: must define ${symbol}`)
    }
    for (const symbol of THREADS_IMPL_SYMBOLS) {
      if (mt !== defined.has(symbol)) {
        problems.push(`${label}: must ${mt ? '' : 'not '}define ${symbol}`)
      }
    }
    if (!mt) {
      // the basic composition has no async worker bootstrap and no thread
      // machinery at all (the full -mt composition matches the emscripten
      // emnapi-mt source list, which does not build the worker bootstrap
      // either, but that is left unasserted there)
      for (const symbol of ['emnapi_async_worker_create', 'emnapi_async_worker_init']) {
        if (defined.has(symbol)) problems.push(`${label}: must not define ${symbol}`)
      }
      const tls = [...defined, ...undef].filter((symbol) => symbol.startsWith('__tls_'))
      const pthread = [...defined].filter((symbol) => symbol.startsWith('pthread_'))
      for (const symbol of [...tls, ...pthread]) {
        problems.push(`${label}: must not reference thread symbol ${symbol}`)
      }
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'))
}

// check 3: link a napi-rs-like probe against each archive and inspect the
// resulting wasm imports; the published 2.0.0-alpha.2 archive bound the env
// cleanup hooks to module "env" and failed exactly this link
function checkImportModules (packageDir, wasiSdkPath, tempDir) {
  const clang = path.join(wasiSdkPath, 'bin', exe('clang'))
  const probeSource = path.join(tempDir, 'probe.c')
  fs.writeFileSync(probeSource, PROBE_SOURCE, 'utf8')
  const problems = []
  for (const { target, archive, mt } of NAPI_RS_ARCHIVES) {
    const label = `lib/${target}/${archive}`
    const libDir = path.join(packageDir, 'lib', target)
    if (!fs.existsSync(path.join(libDir, archive))) {
      problems.push(`${label}: missing from the tarball`)
      continue
    }
    const output = path.join(tempDir, `probe-${target}.wasm`)
    try {
      run(clang, [
        `--target=${target}`,
        ...(mt ? ['-pthread'] : []),
        '-O2',
        '-mexec-model=reactor',
        '-Wl,--import-undefined',
        probeSource,
        `-L${libDir}`,
        `-l${archive.slice('lib'.length, -'.a'.length)}`,
        '-o',
        output
      ])
    } catch (err) {
      problems.push(`${label}: probe link failed\n${err.message}`)
      continue
    }
    const imports = WebAssembly.Module.imports(new WebAssembly.Module(fs.readFileSync(output)))
    const napiModule = imports.filter((entry) => entry.module === 'napi').map((entry) => entry.name).sort()
    const expected = ['napi_add_env_cleanup_hook', 'napi_remove_env_cleanup_hook']
    if (napiModule.join(',') !== expected.join(',')) {
      problems.push(`${label}: imports under module "napi" must be exactly [${expected.join(', ')}], got [${napiModule.join(', ') || '(none)'}]`)
    }
    if (mt) {
      // full composition: the C async work / TSFN implementations live in the
      // archive, so the probe's references must resolve there instead of
      // being imported. Other plain napi_* env imports are expected here: the
      // extracted C implementations call the JS-implemented parts of Node-API
      // (napi_get_undefined, napi_call_function, ...) through module "env"
      for (const symbol of ['napi_create_threadsafe_function', 'napi_create_async_work']) {
        const hit = imports.find((entry) => entry.name === symbol)
        if (hit) {
          problems.push(`${label}: ${symbol} must be defined by the archive, found import ${hit.module}.${symbol}`)
        }
      }
    } else {
      // basic composition: the JS implementations resolve these at
      // instantiation time, through the default ("env") import module
      for (const symbol of ['napi_create_threadsafe_function', 'napi_create_async_work']) {
        if (!imports.some((entry) => entry.module === 'env' && entry.name === symbol)) {
          problems.push(`${label}: plain napi_* symbols must be imported from module "env" (${symbol} not found there)`)
        }
      }
      // --import-undefined turns ANY unresolved symbol into an env import, so
      // a missing archive member surfaces as an extra Node-API import here:
      // only the two "napi" hooks and the probe's deliberate plain references
      // may be imported, everything else napi-ish must be defined by the
      // archive (the basic composition itself never calls back into the
      // JS-implemented parts of Node-API from the probe's call graph)
      const allowedImports = new Set([
        'napi.napi_add_env_cleanup_hook',
        'napi.napi_remove_env_cleanup_hook',
        'env.napi_create_threadsafe_function',
        'env.napi_create_async_work'
      ])
      const unexpectedImports = imports
        .filter((entry) => /^(napi_|node_api_)/.test(entry.name) && !allowedImports.has(`${entry.module}.${entry.name}`))
        .map((entry) => `${entry.module}.${entry.name}`)
      if (unexpectedImports.length > 0) {
        problems.push(`${label}: unexpected Node-API imports (the archive must define these): ${unexpectedImports.join(', ')}`)
      }
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'))
}

// check 4: the Release workflow ("main" target) publishes runtime, emnapi and
// core together in one `npm publish -w ...` and derives the release tag from
// the emnapi version, and the root `bump` script versions them as one unit,
// so the trio must share a version; @emnapi/wasi-threads is an independent
// release target and is deliberately NOT asserted against
function checkVersionEquality () {
  const read = (dir) => fs.readJsonSync(path.join(repoRoot, 'packages', dir, 'package.json'))
  const emnapi = read('emnapi')
  const problems = []
  for (const pkg of [read('runtime'), read('core')]) {
    if (pkg.version !== emnapi.version) {
      problems.push(`${pkg.name}@${pkg.version} must share the emnapi version ${emnapi.version}`)
    }
  }
  if (problems.length > 0) throw new Error(problems.join('\n'))
}

// check 5: from a scratch consumer, the packed @emnapi/core resolves the
// ./plugins subpath and exposes the asyncWork/tsfn plugin factories
function checkCorePlugins (tempDir, packDir) {
  const coreTarball = packWorkspace('packages/core', packDir)
  const consumerDir = path.join(tempDir, 'consumer')
  const coreDir = path.join(consumerDir, 'node_modules/@emnapi/core')
  fs.mkdirSync(coreDir, { recursive: true })
  run('tar', ['-xzf', coreTarball, '--strip-components=1', '-C', coreDir])
  fs.writeJsonSync(path.join(consumerDir, 'package.json'), { private: true, type: 'module' })
  for (const dep of ['tslib', '@emnapi/wasi-threads']) {
    const source = path.join(repoRoot, 'node_modules', dep)
    if (fs.existsSync(source)) {
      fs.ensureSymlinkSync(source, path.join(consumerDir, 'node_modules', dep), 'junction')
    }
  }
  const probe = path.join(consumerDir, 'probe.mjs')
  fs.writeFileSync(probe, `import * as plugins from '@emnapi/core/plugins'
const missing = ['asyncWork', 'tsfn'].filter((name) => typeof plugins[name] !== 'function')
if (missing.length > 0) {
  console.error('missing plugin factories: ' + missing.join(', '))
  process.exit(1)
}
console.log('plugin factories: ' + Object.keys(plugins).sort().join(', '))
`, 'utf8')
  console.log(run(process.execPath, [probe], { cwd: consumerDir }).trim())
}

async function main () {
  const args = process.argv.slice(2)
  let tarball = null
  for (let i = 0; i < args.length; ++i) {
    if (args[i] === '--prepared') {
      // validate the existing release output; this is also the default
      // behavior when no tarball is given, the flag only states the intent
    } else if (args[i] === '--tarball' && args[i + 1]) {
      tarball = path.resolve(args[++i])
    } else {
      throw new Error(`Unknown option: ${args[i]}\nUsage: node ./script/test-release-package.js [--prepared] [--tarball <emnapi.tgz>]`)
    }
  }

  const wasiSdkPath = resolveWasiSdkPath()
  const shippedLibDir = path.join(repoRoot, 'packages/emnapi/lib')
  if (!tarball && (!fs.existsSync(path.join(shippedLibDir, 'wasm32-wasip1')) || !fs.existsSync(path.join(shippedLibDir, 'wasm32-wasip1-threads')))) {
    throw new Error(
      'release output is absent (packages/emnapi/lib/wasm32-wasip1*): ' +
      'run `node ./script/release.js` first, then re-run this script'
    )
  }

  const failures = []
  const check = async (name, fn) => {
    try {
      await fn()
      console.log(`[PASS] ${name}`)
    } catch (err) {
      failures.push(name)
      console.error(`[FAIL] ${name}`)
      console.error(String((err && err.message) || err).replace(/^/gm, '    '))
    }
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emnapi-release-package-'))
  try {
    const packDir = path.join(tempDir, 'pack')
    const packageDir = path.join(tempDir, 'emnapi-package')
    fs.mkdirSync(packDir, { recursive: true })
    fs.mkdirSync(packageDir, { recursive: true })
    const emnapiTarball = tarball || packWorkspace('packages/emnapi', packDir)
    // npm tarballs place everything under the top-level "package/" directory
    run('tar', ['-xzf', emnapiTarball, '--strip-components=1', '-C', packageDir])

    await check('tarball-content-allowlist', () => checkTarballAllowlist(packageDir))
    await check('symbol-profile', () => checkSymbolProfiles(packageDir, wasiSdkPath))
    await check('import-module', () => checkImportModules(packageDir, wasiSdkPath, tempDir))
    await check('version-equality', () => checkVersionEquality())
    await check('core-plugins-subpath', () => checkCorePlugins(tempDir, packDir))
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true })
  }

  if (failures.length > 0) {
    console.error(`\nrelease package validation failed: ${failures.join(', ')}`)
    process.exit(1)
  }
  console.log('\nAll release package checks passed')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
