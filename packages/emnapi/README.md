# emnapi

<p align="center">
  <img src="https://toyobayashi.github.io/emnapi-docs/emnapi.svg" alt="emnapi logo" width="256" />
</p>

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/toyobayashi/toyobayashi/sponsorkit/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/toyobayashi/toyobayashi/sponsorkit/sponsors.svg'/>
  </a>
</p>

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

# This is 2.x branch, [go stable 1.x branch here](https://github.com/toyobayashi/emnapi/tree/v1.x)

[Node-API](https://nodejs.org/docs/latest/api/n-api.html) implementation for [Emscripten](https://emscripten.org/index.html), [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) and clang with wasm support.

This project aims to

- Help users port their or existing Node-API native addons to wasm with code change as less as possible.
- Make runtime behavior matches native Node.js as much as possible.

This project also powers the WebAssembly feature for [napi-rs](https://github.com/napi-rs/napi-rs), and enables many Node.js native addons to run on [StackBlitz](https://stackblitz.com)'s WebContainer.

[Node-API changes](https://github.com/nodejs/node/pulls?q=is%3Apr+label%3Anode-api+) will be synchronized into this repo.

See documentation for more details:
- [https://toyobayashi.github.io/emnapi-docs/guide/](https://toyobayashi.github.io/emnapi-docs/guide/)
- [https://emnapi-docs.vercel.app/guide/](https://emnapi-docs.vercel.app/guide/)

中文文档：
- [https://toyobayashi.github.io/emnapi-docs/zh/guide/](https://toyobayashi.github.io/emnapi-docs/zh/guide/)
- [https://emnapi-docs.vercel.app/zh/guide/](https://emnapi-docs.vercel.app/zh/guide/)

[Full API List](https://toyobayashi.github.io/emnapi-docs/reference/list.html)

[How to build Node-API official examples](https://github.com/toyobayashi/node-addon-examples)

If you want to deep dive into WebAssembly, highly recommend you to visit [learn-wasm.dev](https://learn-wasm.dev?via=toyobayashi).

## Prerequests

You will need to install:

- Node.js `>= v22.12.0`
- npm `>= v8`

Tool chain choices:

- Emscripten `>= v4.1.7` with `EMSDK` environment variable set
- wasi-sdk `>= v26` with `WASI_SDK_PATH` environment variable set

Build system choices:

- CMake `>= v3.13`
- node-gyp `>= v10.2.0`
- make / ninja

Optional:

- [node-addon-api](https://github.com/nodejs/node-addon-api) `>= 6.1.0`

There are several choices to get `make` for Windows user

- Install [mingw-w64](https://www.mingw-w64.org/downloads/), then use `mingw32-make`
- Download [MSVC prebuilt binary of GNU make](https://github.com/toyobayashi/make-win-build/releases), add to `%Path%` then rename it to `mingw32-make`
- Install [Visual Studio 2022](https://visualstudio.microsoft.com/) C++ desktop workload, use `nmake` in `Visual Studio Developer Command Prompt`
- Install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), use `nmake` in `Visual Studio Developer Command Prompt`

## Build from source

```bash
git clone https://github.com/toyobayashi/emnapi.git
cd ./emnapi
npm install -g node-gyp
npm install
npm run build             # output ./packages/*/dist
node ./script/release.js  # output ./out

# test for emscripten
npm run rebuild -w packages/test
npm run test -w packages/test

# test for wasi-sdk
npm run rebuild:wt -w packages/test
npm run test:wt -w packages/test
```

See [CONTRIBUTING](https://github.com/toyobayashi/emnapi/blob/main/CONTRIBUTING.md) for more details.

## Quick Start

[See full example](https://github.com/toyobayashi/emnapi/tree/main/packages/example)

### NPM Install

```bash
npm install -D emnapi
npm install @emnapi/runtime

# additionally, for wasi-sdk, install @emnapi/core
npm install @emnapi/core

# if you need node-addon-api
npm install node-addon-api
```

Each package should match the same version.

### Using C

Create `binding.c`:

```c
#include <node_api.h>

// ...

NAPI_MODULE_INIT() {
  napi_value fn;
  napi_create_function(env, "run", NAPI_AUTO_LENGTH, run, NULL, &fn);
  napi_set_named_property(env, exports, "run", fn);
  return exports;
}
```

Build with Emscripten:

```bash
emcc -O3 -pthread \
    -DBUILDING_NODE_EXTENSION \
    "-DNAPI_EXTERN=__attribute__((__import_module__(\"env\")))" \
    -I./node_modules/emnapi/include/node \
    -L./node_modules/emnapi/lib/wasm32-emscripten \
    --js-library=./node_modules/emnapi/dist/library_napi.js \
    -sWASM_BIGINT=1 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sALLOW_TABLE_GROWTH=1 \
    -sEXPORTED_FUNCTIONS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_FUNCTIONS)") \
    -sEXPORTED_RUNTIME_METHODS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_RUNTIME_METHODS)") \
    -sEXPORT_ES6=1 \
    -sPTHREAD_POOL_SIZE=4 \
    -o out/binding.js \
    binding.c \
    -lemnapi-mt
```

Build with wasi-sdk:

The `wasi-libc` futex ABI changed in wasi-sdk 34. The package keeps the
original `wasm32-wasip1-threads` archive set for wasi-sdk 33 or older and
ships the new ABI under `wasm32-wasip1-threads-wasi-sdk-34` for wasi-sdk 34 or
newer. Keep the directory and the wasi-sdk used for linking matched; the
archive name remains `-lemnapi-mt` in both cases.

```bash
"$WASI_SDK_PATH/bin/clang" --target=wasm32-wasip1-threads -O3 \
    -pthread -matomics -mbulk-memory \
    -DBUILDING_NODE_EXTENSION \
    -I./node_modules/emnapi/include/node \
    -L./node_modules/emnapi/lib/wasm32-wasip1-threads-wasi-sdk-34 \
    --sysroot="$WASI_SDK_PATH/share/wasi-sysroot" \
    -mexec-model=reactor \
    -Wl,--import-memory -Wl,--shared-memory -Wl,--export-memory \
    -Wl,--export-table -Wl,--growable-table \
    -Wl,--export=malloc,--export=free \
    -Wl,--export=napi_register_wasm_v1 \
    -Wl,--export=emnapi_create_env,--export=emnapi_delete_env \
    -Wl,--export-if-defined=node_api_module_get_api_version_v1 \
    -Wl,--export-if-defined=uv_library_shutdown \
    -Wl,--import-undefined \
    -o out/binding.wasm \
    binding.c \
    -lemnapi-mt
```

Use in JavaScript (Emscripten):

```js
import init from './out/binding.js'
import { createContext } from '@emnapi/runtime'

const emnapiCtx = createContext()
const Module = await init()
const binding = Module.emnapiInit({
  context: emnapiCtx,
  asyncWorkPoolSize: 4 // the same effect to UV_THREADPOOL_SIZE, must less than PTHREAD_POOL_SIZE
})
binding.run(/* ... */)

// cleanup
Module._uv_library_shutdown()
emnapiCtx.destroy()
```

For non-emscripten please [reference full JavaScript example](https://github.com/toyobayashi/emnapi/tree/main/packages/example/index-wasi.js)

<!---->

### Using C++ and node-addon-api

**Note: C++ wrapper can only be used to target Node.js v14.6.0+ and modern browsers those support `FinalizationRegistry` and `WeakRef` ([v8 engine v8.4+](https://v8.dev/blog/v8-release-84))!**

Create `binding.cpp`:

```cpp
#include <napi.h>

// ...

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("run", Napi::Function::New(env, Run));
  return exports;
}

NODE_API_MODULE(binding, Init)
```

Build with Emscripten:

```bash
em++ -O3 -pthread \
    -DBUILDING_NODE_EXTENSION \
    -DNAPI_DISABLE_CPP_EXCEPTIONS \
    "-DNAPI_EXTERN=__attribute__((__import_module__(\"env\")))" \
    -I./node_modules/emnapi/include/node \
    -I$(node -p "require('node-addon-api').include_dir") \
    -L./node_modules/emnapi/lib/wasm32-emscripten \
    --js-library=./node_modules/emnapi/dist/library_napi.js \
    -sWASM_BIGINT=1 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sALLOW_TABLE_GROWTH=1 \
    -sEXPORTED_FUNCTIONS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_FUNCTIONS)") \
    -sEXPORTED_RUNTIME_METHODS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_RUNTIME_METHODS)") \
    -sEXPORT_ES6=1 \
    -sPTHREAD_POOL_SIZE=4 \
    -o out/binding-naa.js \
    binding.cpp \
    -lemnapi-mt
```

Build with wasi-sdk:

```bash
"$WASI_SDK_PATH/bin/clang++" --target=wasm32-wasip1-threads -O3 \
    -pthread -matomics -mbulk-memory -fno-exceptions \
    -DBUILDING_NODE_EXTENSION \
    -DNAPI_DISABLE_CPP_EXCEPTIONS \
    -I./node_modules/emnapi/include/node \
    -I$(node -p "require('node-addon-api').include_dir") \
    -L./node_modules/emnapi/lib/wasm32-wasip1-threads-wasi-sdk-34 \
    --sysroot="$WASI_SDK_PATH/share/wasi-sysroot" \
    -mexec-model=reactor \
    -Wl,--import-memory -Wl,--shared-memory -Wl,--export-memory \
    -Wl,--export-table -Wl,--growable-table \
    -Wl,--export=malloc,--export=free \
    -Wl,--export=napi_register_wasm_v1 \
    -Wl,--export=emnapi_create_env,--export=emnapi_delete_env \
    -Wl,--export-if-defined=node_api_module_get_api_version_v1 \
    -Wl,--export-if-defined=uv_library_shutdown \
    -Wl,--import-undefined \
    -o out/binding-naa.wasm \
    binding.cpp \
    -lemnapi-mt
```

### Using CMake

Create `CMakeLists.txt`:

```cmake
cmake_minimum_required(VERSION 3.13)
project(myproject)

# optional: enable node-addon-api
# set(EMNAPI_FIND_NODE_ADDON_API ON)

add_subdirectory("node_modules/emnapi")

add_executable(binding binding.c)

target_link_libraries(binding PRIVATE emnapi-mt)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  # ...
elseif((CMAKE_SYSTEM_NAME STREQUAL "WASI") AND ((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasi-threads") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasip1-threads")))
  # ...
endif()
```

Build with Emscripten:

```bash
mkdir build && cd build
emcmake cmake .. -DCMAKE_BUILD_TYPE=Release
cmake --build .
```

Build with wasi-sdk:

```bash
mkdir build && cd build
cmake .. -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_TOOLCHAIN_FILE="$WASI_SDK_PATH/share/cmake/wasi-sdk-pthread.cmake"
cmake --build .
```

### Using node-gyp

Require node-gyp `>= 10.2.0`

See [emnapi-node-gyp-test](https://github.com/toyobayashi/emnapi-node-gyp-test) for examples.

- Variables

Arch: `node-gyp configure --arch=<wasm32 | wasm64>`

```ts
// node-gyp configure -- -Dvariable_name=value

declare var OS: 'emscripten' | 'wasi' | 'unknown' | 'wasm' | ''

/**
 * Enable async work and threadsafe-functions
 * @default 0
 */
declare var wasm_threads: 0 | 1

/** @default 1048576 */
declare var stack_size: number

/** @default 16777216 */
declare var initial_memory: number

/** @default 2147483648 */
declare var max_memory: number

/** @default path.join(path.dirname(commonGypiPath,'./dist/library_napi.js')) */
declare var emnapi_js_library: string

/** @default 0 */
declare var emnapi_manual_linking: 0 | 1
```

- Create `binding.gyp`


```py
{
  "targets": [
    {
      "target_name": "hello",
      "sources": [
        "hello.c"
      ],
      "conditions": [
        ["OS == 'emscripten'", {
          "product_extension": "js", # required

          "cflags": [],
          "cflags_c": [],
          "cflags_cc": [],
          "ldflags": []
        }],
        ["OS == 'wasi'", {
          # ...
        }],
        ["OS in ' wasm unknown'", {
          # ...
        }]
      ]
    }
  ]
}
```

- Add the following environment variables.

```bash
# Linux or macOS
export GYP_CROSSCOMPILE=1

# emscripten
export AR_target="$EMSDK/upstream/emscripten/emar"
export CC_target="$EMSDK/upstream/emscripten/emcc"
export CXX_target="$EMSDK/upstream/emscripten/em++"

# wasi-sdk
export AR_target="$WASI_SDK_PATH/bin/ar"
export CC_target="$WASI_SDK_PATH/bin/clang"
export CXX_target="$WASI_SDK_PATH/bin/clang++"
```

```bat
@REM Windows

set GYP_CROSSCOMPILE=1

@REM emscripten
call set AR_target=%%EMSDK:\=/%%/upstream/emscripten/emar.bat
call set CC_target=%%EMSDK:\=/%%/upstream/emscripten/emcc.bat
call set CXX_target=%%EMSDK:\=/%%/upstream/emscripten/em++.bat

@REM wasi-sdk
call set AR_target=%%WASI_SDK_PATH:\=/%%/bin/ar.exe
call set CC_target=%%WASI_SDK_PATH:\=/%%/bin/clang.exe
call set CXX_target=%%WASI_SDK_PATH:\=/%%/bin/clang++.exe
```

- Build

```bash
# Linux or macOS

# emscripten
emmake node-gyp rebuild \
  --arch=wasm32 \
  --nodedir=./node_modules/emnapi \
  -- -f make-emscripten # -Dwasm_threads=1

# wasi
node-gyp rebuild \
  --arch=wasm32 \
  --nodedir=./node_modules/emnapi \
  -- -f make-wasi # -Dwasm_threads=1

# bare wasm32
node-gyp rebuild \
  --arch=wasm32 \
  --nodedir=./node_modules/emnapi \
  -- -f make-wasm # -Dwasm_threads=1
```

```bat
@REM Use make generator on Windows
@REM Run the bat file in POSIX-like environment (e.g. Cygwin)

@REM emscripten
call npx.cmd node-gyp configure --arch=wasm32 --nodedir=./node_modules/emnapi -- -f make-emscripten
call emmake.bat make -C %~dp0build

@REM wasi
call npx.cmd node-gyp configure --arch=wasm32 --nodedir=./node_modules/emnapi -- -f make-wasi
make -C %~dp0build

@REM bare wasm32
call npx.cmd node-gyp configure --arch=wasm32 --nodedir=./node_modules/emnapi -- -f make-wasm
make -C %~dp0build
```

### Experimental V8 API shim and NAN

The V8 API shim is experimental and incomplete. It currently provides a
minimal compatibility layer focused on the V8 APIs NAN uses; it is not a
complete V8 implementation.

Install NAN if the addon uses it:

```bash
npm install -D nan
```

A minimal NAN addon looks like this:

```cpp
#include <nan.h>

NAN_METHOD(Hello) {
  info.GetReturnValue().Set(Nan::New("world").ToLocalChecked());
}

NAN_MODULE_INIT(Init) {
  Nan::SetMethod(target, "hello", Hello);
}

NODE_MODULE(binding, Init)
```

You can also use the V8 API directly:

```cpp
#include <node.h>
#include <v8.h>

void Hello(const v8::FunctionCallbackInfo<v8::Value>& info) {
  info.GetReturnValue().Set(
      v8::String::NewFromUtf8(info.GetIsolate(), "world").ToLocalChecked());
}

NODE_MODULE_INIT() {
  NODE_SET_METHOD(exports, "hello", Hello);
}
```

The example that uses the V8 API directly can be built single-threaded. With
CMake, link the `v8` and `emnapi` targets:

```cmake
cmake_minimum_required(VERSION 3.13)
project(binding LANGUAGES C CXX)

add_subdirectory("node_modules/emnapi" emnapi)
add_executable(binding binding.cpp)
target_link_libraries(binding PRIVATE v8 emnapi)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  target_link_options(binding PRIVATE
    "-sWASM_BIGINT=1"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sALLOW_TABLE_GROWTH=1"
    "-sMODULARIZE=1"
    "-sEXPORTED_RUNTIME_METHODS=['emnapiInit','ExitStatus','wasmMemory','growMemory']"
    "-sEXPORTED_FUNCTIONS=['_malloc','_free','_emnapi_create_env','_emnapi_delete_env']"
  )
endif()
```

Synchronous NAN addons can use the single-threaded `v8` and `emnapi` targets.
Add NAN's include directory to the target:

```cmake
target_include_directories(binding PRIVATE "node_modules/nan")
target_link_libraries(binding PRIVATE v8 emnapi)
```

The bundled `uv.h` exposes the libuv types NAN needs to compile without
including pthread headers. Thread-backed libuv functions are still implemented
only in threaded builds. In particular, NAN's `AsyncWorker` and progress
workers call `uv_queue_work`, so addons that use them need the threaded
targets:

```cmake
target_link_libraries(binding PRIVATE v8-mt emnapi-mt)
target_compile_options(binding PRIVATE -pthread)
target_link_options(binding PRIVATE -pthread)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  target_link_options(binding PRIVATE
    "-sPTHREAD_POOL_SIZE=4"
    "-sPTHREAD_POOL_SIZE_STRICT=2"
  )
endif()
```

The CMake targets add the required Emscripten JavaScript libraries. The V8
shim is available for Emscripten and WASI targets; the bare
`wasm32-unknown-unknown` target does not build it.

For Emscripten, initialize the generated module with an emnapi context:

```js
import { createRequire } from 'node:module'
import { createContext } from '@emnapi/runtime'

const require = createRequire(import.meta.url)
const createModule = require('./build/binding.js')
const Module = await createModule()
const binding = Module.emnapiInit({ context: createContext() })
console.log(binding.hello())
```

To instantiate a WASI module through `@emnapi/core`, pass the V8 plugin and
the WASI instance to `instantiateNapiModule`:

```js
import { instantiateNapiModule } from '@emnapi/core'
import v8 from '@emnapi/core/plugins/v8'
import { createContext } from '@emnapi/runtime'

const { napiModule } = await instantiateNapiModule(wasmBytes, {
  context: createContext(),
  wasi,
  plugins: [v8]
})
const binding = napiModule.exports
```

The V8 plugin is the only plugin required for the V8 shim.

### Using Rust

See [napi-rs](https://github.com/napi-rs/napi-rs) 

### Reference for instantiateNapiModule input parameters

```js
// emnapi main thread (could be in a Worker)
instantiateNapiModule(input, {
  context: getDefaultContext(),
  asyncWorkPoolSize: 4, // the same effect to UV_THREADPOOL_SIZE, must less than `reuseWorker.size`
  wasi: new WASI(/* ... */),

  /**
   * Setting this to `true` or a delay (ms) makes
   * pthread_create() do not return until worker actually start.
   * It will throw error if emnapi runs in browser main thread
   * since browser disallow blocking the main thread (Atomics.wait).
   * @defaultValue false
   */
  waitThreadStart: isNode || (isBrowser && !isBrowserMainThread),

  /**
   * Reuse the thread worker after thread exit to avoid re-creatation
   *
   * With `size > 0`, `instantiateNapiModule` / `loadNapiModule` wait until
   * every pool worker has loaded. `instantiateNapiModuleSync` /
   * `loadNapiModuleSync` also accept a pool: they start loading the pool
   * workers in the background and return without waiting, so the pool is
   * not guaranteed to be ready. A thread started on a pool worker that is
   * still loading runs once that worker has loaded.
   * A pool worker that fails to load while idle is terminated and replaced
   * by a fresh worker, so the pool keeps its size; the replacement is
   * loaded when a thread is started on it.
   * A pool worker that was never loaded is loaded on first use.
   * @defaultValue false
   */
  reuseWorker: {
    /**
     * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size | PTHREAD_POOL_SIZE}
     */
    size: 0,

    /**
     * @see {@link https://emscripten.org/docs/tools_reference/settings_reference.html#pthread-pool-size-strict | PTHREAD_POOL_SIZE_STRICT}
     */
    strict: false
  },

  onCreateWorker () {
    return new Worker('./worker.js')
    // Node.js
    // const { Worker } = require('worker_threads')
    // return new Worker(join(__dirname, './worker.js'), {
    //   env: process.env,
    //   execArgv: ['--experimental-wasi-unstable-preview1']
    // })
  },
  overwriteImports (importObject) {
    importObject.env.memory = new WebAssembly.Memory({
      initial: 16777216 / 65536,
      maximum: 2147483648 / 65536,
      shared: true
    })
  }
})
```

Note: For browsers, all the multithreaded features relying on Web Workers (Emscripten pthread also relying on Web Workers)
require cross-origin isolation to enable `SharedArrayBuffer`. You can make a page cross-origin isolated
by serving the page with these headers:

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```
