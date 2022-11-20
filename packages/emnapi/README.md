# emnapi

<p align="center">
  <img src="https://toyobayashi.github.io/emnapi-docs/emnapi.svg" alt="emnapi logo" width="256" />
</p>

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

[Node-API (version 8)](https://nodejs.org/docs/v16.15.0/api/n-api.html) implementation for [Emscripten](https://emscripten.org/index.html), based on Node.js v16.15.0.

See documentation for more details:
- [https://toyobayashi.github.io/emnapi-docs/guide/](https://toyobayashi.github.io/emnapi-docs/guide/)
- [https://emnapi-docs.vercel.app/guide/](https://emnapi-docs.vercel.app/guide/)

中文文档：
- [https://toyobayashi.github.io/emnapi-docs/zh/guide/](https://toyobayashi.github.io/emnapi-docs/zh/guide/)
- [https://emnapi-docs.vercel.app/zh/guide/](https://emnapi-docs.vercel.app/zh/guide/)

[Full API List](https://toyobayashi.github.io/emnapi-docs/reference/list.html)

[How to build Node-API official examples](https://github.com/toyobayashi/node-addon-examples)

## Quick Start

You will need to install:

- Node.js `>= v14.6.0`
- Emscripten `>= v3.0.0` (`v2.x` may also works, not tested)

Verify your environment:

```bash
node -v
npm -v
emcc -v
```

### NPM Install

```bash
npm install -D @tybys/emnapi
```

### Using C

Create `hello.c`.

```c
#include <node_api.h>
#include <string.h>

#define NAPI_CALL(env, the_call)                                \
  do {                                                          \
    if ((the_call) != napi_ok) {                                \
      const napi_extended_error_info *error_info;               \
      napi_get_last_error_info((env), &error_info);             \
      bool is_pending;                                          \
      const char* err_message = error_info->error_message;      \
      napi_is_exception_pending((env), &is_pending);            \
      if (!is_pending) {                                        \
        const char* error_message = err_message != NULL ?       \
          err_message :                                         \
          "empty error message";                                \
        napi_throw_error((env), NULL, error_message);           \
      }                                                         \
      return NULL;                                              \
    }                                                           \
  } while (0)

static napi_value js_hello(napi_env env, napi_callback_info info) {
  napi_value world;
  const char* str = "world";
  size_t str_len = strlen(str);
  NAPI_CALL(env, napi_create_string_utf8(env, str, str_len, &world));
  return world;
}

NAPI_MODULE_INIT() {
  napi_value hello;
  NAPI_CALL(env, napi_create_function(env, "hello", NAPI_AUTO_LENGTH,
                                      js_hello, NULL, &hello));
  NAPI_CALL(env, napi_set_named_property(env, exports, "hello", hello));
  return exports;
}
```

The C code is equivalant to the following JavaScript:

```js
module.exports = (function (exports) {
  const hello = function hello () {
    // native code in js_hello
    const world = 'world'
    return world
  }

  exports.hello = hello
  return exports
})(module.exports)
```

Compile `hello.c` using `emcc`, set include directory by `-I`, export `_malloc` and `_free`, link emnapi JavaScript library by `--js-library`.

```bash
emcc -O3 \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -o hello.js \
     ./node_modules/@tybys/emnapi/src/emnapi.c \
     hello.c
```

Use the output js in html. The default export key is `emnapiExports` on [`Module`](https://emscripten.org/docs/api_reference/module.html) object. You can change the key by predefining `NODE_GYP_MODULE_NAME`. `onEmnapiInitialized` will be called before `onRuntimeInitialized`.

```html
<script src="hello.js"></script>
<script>
// Emscripten js glue code will create a global `Module` object
Module.onEmnapiInitialized = function (err, emnapiExports) {
  if (err) {
    // error handling
    // emnapiExports === undefined
    // Module[NODE_GYP_MODULE_NAME] === undefined
    console.error(err);
  } else {
    // emnapiExports === Module[NODE_GYP_MODULE_NAME]
  }
};

Module.onRuntimeInitialized = function () {
  if (!('emnapiExports' in Module)) return;
  var binding = Module.emnapiExports;
  var msg = 'hello ' + binding.hello();
  window.alert(msg);
};
</script>
```

If you are using `Visual Studio Code` and have `Live Server` extension installed, you can right click the HTML file in Visual Studio Code source tree and click `Open With Live Server`, then you can see the hello world alert!

Running on Node.js:

```js
const Module = require('./hello.js')

Module.onEmnapiInitialized = function (err, emnapiExports) {
  // ...
}

Module.onRuntimeInitialized = function () {
  if (!('emnapiExports' in Module)) return
  const binding = Module.emnapiExports
  const msg = `hello ${binding.hello()}`
  console.log(msg)
}
```

### Using C++

Alternatively, you can also use [`node-addon-api`](https://github.com/nodejs/node-addon-api) which is official Node-API C++ wrapper, already shipped (v5.0.0) in this package but without Node.js specific API such as `AsyncContext`, `Function::MakeCallback`, etc.

**Note: C++ wrapper can only be used to target Node.js v14.6.0+ and modern browsers those support `FinalizationRegistry` and `WeakRef` ([v8 engine v8.4+](https://v8.dev/blog/v8-release-84))!**

Create `hello.cpp`.

```cpp
#include <napi.h>

Napi::String Method(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  return Napi::String::New(env, "world");
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set(Napi::String::New(env, "hello"),
              Napi::Function::New(env, Method)).Check();
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
```

Compile `hello.cpp` using `em++`. C++ exception is disabled by Emscripten default, so predefine `-DNAPI_DISABLE_CPP_EXCEPTIONS` and `-DNODE_ADDON_API_ENABLE_MAYBE` here. If you would like to enable C++ exception, use `-sDISABLE_EXCEPTION_CATCHING=0` instead and remove `.Check()` call. See official documentation [here](https://github.com/nodejs/node-addon-api/blob/main/doc/error_handling.md).

```bash
em++ -O3 \
     -DNAPI_DISABLE_CPP_EXCEPTIONS \
     -DNODE_ADDON_API_ENABLE_MAYBE \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -o hello.js \
     ./node_modules/@tybys/emnapi/src/emnapi.c \
     hello.cpp
```

### Using CMake

You will need to install:

- CMake `>= 3.13`
- ninja / make

There are several choices to get `make` for Windows user

- Install [mingw-w64](https://www.mingw-w64.org/downloads/), then use `mingw32-make`
- Download [MSVC prebuilt binary of GNU make](https://github.com/toyobayashi/make-win-build/releases), add to `%Path%` then rename it to `mingw32-make`
- Install [Visual Studio 2022](https://visualstudio.microsoft.com/) C++ desktop workload, use `nmake` in `Visual Studio Developer Command Prompt`
- Install [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/), use `nmake` in `Visual Studio Developer Command Prompt`

Verify your environment:

```bash
cmake --version

# if you use ninja
ninja --version

# if you use make
make -v

# if you use nmake in Visual Studio Developer Command Prompt
nmake /?
```

Create `CMakeLists.txt`.

```cmake
cmake_minimum_required(VERSION 3.13)

project(emnapiexample)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")

add_executable(hello hello.c)
# or add_executable(hello hello.cpp)

target_link_libraries(hello emnapi_full)
target_link_options(hello PRIVATE
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
)
```

Building with `emcmake`, output `build/hello.js` and `build/hello.wasm`.

```bash
mkdir build

emcmake cmake -DCMAKE_BUILD_TYPE=Release -G Ninja -H. -Bbuild
# emcmake cmake -DCMAKE_BUILD_TYPE=Release -G "Unix Makefiles" -H. -Bbuild
# emcmake cmake -DCMAKE_BUILD_TYPE=Release -G "MinGW Makefiles" -H. -Bbuild
# emcmake cmake -DCMAKE_BUILD_TYPE=Release -G "NMake Makefiles" -H. -Bbuild

cmake --build build
```

Output code can run in recent version modern browsers and Node.js latest LTS. IE is not supported.

If a JS error is thrown on runtime initialization, Node.js process will exit. You can use `-sNODEJS_CATCH_EXIT=0` and add `uncaughtException` handler yourself to avoid this. Alternatively, you can use `Module.onEmnapiInitialized` callback to catch error.

### Multithread

If you want to use async work or thread safe functions,
there are additional C source file need to be compiled and linking.
Recommend use CMake directly.

```cmake
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")

add_executable(hello hello.c)

target_link_libraries(hello emnapi_full-mt)
target_compile_options(hello PRIVATE "-sUSE_PTHREADS=1")
target_link_options(hello PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "-sUSE_PTHREADS=1"
  "-sPTHREAD_POOL_SIZE=4"
)
```

```bash
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DEMNAPI_WORKER_POOL_SIZE=4 -G Ninja -H. -Bbuild
cmake --build build
```

## Preprocess Macro Options

### `-DEMNAPI_WORKER_POOL_SIZE=4`

This is [`UV_THREADPOOL_SIZE`](http://docs.libuv.org/en/v1.x/threadpool.html?highlight=UV_THREADPOOL_SIZE) equivalent at compile time, if not predefined, emnapi will read `UV_THREADPOOL_SIZE` from Emscripten [environment variable](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#interacting-with-code-environment-variables) at runtime, you can set `UV_THREADPOOL_SIZE` like this:

```js
Module.preRun = Module.preRun || [];
Module.preRun.push(function () {
  if (typeof ENV !== 'undefined') {
    ENV.UV_THREADPOOL_SIZE = '2';
  }
});
```

It represent max of `EMNAPI_WORKER_POOL_SIZE` async work (`napi_queue_async_work`) can be executed in parallel. Default is not defined, read `UV_THREADPOOL_SIZE` at runtime.

You can set both `PTHREAD_POOL_SIZE` and `EMNAPI_WORKER_POOL_SIZE` to `number of CPU cores` in general.
If you use another library function which may create `N` child threads in async work,
then you need to set `PTHREAD_POOL_SIZE` to `EMNAPI_WORKER_POOL_SIZE * (N + 1)`.

This option only has effect if you use `-sUSE_PTHREADS`.
Emnapi will create `EMNAPI_WORKER_POOL_SIZE` threads when initializing,
it will throw error if `PTHREAD_POOL_SIZE < EMNAPI_WORKER_POOL_SIZE && PTHREAD_POOL_SIZE_STRICT == 2`.

See [Issue #8](https://github.com/toyobayashi/emnapi/issues/8) for more detail.

### `-DEMNAPI_NEXTTICK_TYPE=0`

This option only has effect if you use `-sUSE_PTHREADS`, Default is `0`.
Tell emnapi how to delay async work in `uv_async_send` / `uv__async_close`.

- `0`: Use `setImmediate()` (Node.js native `setImmediate` or browser `MessageChannel` and `port.postMessage`)
- `1`: Use `Promise.resolve().then()`

### `-DEMNAPI_USE_PROXYING=1`

This option only has effect if you use `-sUSE_PTHREADS`. Default is `1` if emscripten version `>= 3.1.9`, else `0`.

- `0`

    Use JavaScript implementation to send async work from worker threads, runtime code will access the Emscripten internal `PThread` object to add custom worker message listener.

- `1`:

    Use Emscripten [proxying API](https://emscripten.org/docs/api_reference/proxying.h.html) to send async work from worker threads in C. If you experience something wrong, you can switch set this to `0` and feel free to create an issue.

## Emnapi Runtime

Most APIs are implemented in JavaScript and they are depend on runtime code shipped in `library_napi.js` library file. So if you are building multiple wasm target, the same runtime code will be linked into each wasm glue js file. This is problematic when passing JavaScript objects across wasm bindings in same web page, we need to share emnapi's runtime code between multiple wasms like this:

1. Installing emnapi runtime

    ```bash
    npm install @tybys/emnapi-runtime
    ```

2. Linking no runtime library build

    - emcc

      ```bash
      emcc ... --js-library=./node_modules/@tybys/emnapi/dist/library_napi_no_runtime.js
      ```

    - cmake

      ```cmake
      add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")
      target_link_libraries(hello emnapi_noruntime)
      ```

3. Importing runtime code

    - Browser

        ```html
        <script src="node_modules/@tybys/emnapi-runtime/dist/emnapi.min.js"></script>
        <script src="your-wasm-glue.js"></script>
        ```
    
    - Node.js

        Just npm install `@tybys/emnapi-runtime` 

    You can specify `emnapiRuntime` explicitly, this step is optional:

    ```html
    <script src="node_modules/@tybys/emnapi-runtime/dist/emnapi.min.js"></script>
    <script>
      var Module = { /* ... */ };
      Module.emnapiRuntime = window.__emnapi_runtime__;
    </script>
    <script src="your-wasm-glue.js"></script>
    ```

    ```js
    // Node.js
    Module.emnapiRuntime = require('@tybys/emnapi-runtime')
    ```

`@tybys/emnapi-runtime` version should match `@tybys/emnapi` version.

## Building

```bash
git clone https://github.com/toyobayashi/emnapi.git
cd ./emnapi
npm install
npm run build # output ./packages/*/dist

# test
npm run rebuild:test
npm test

# CMake install
cd ./packages/emnapi

emcmake cmake -DCMAKE_BUILD_TYPE=Release -H. -Bbuild

# Windows have mingw32-make installed
# emcmake cmake -DCMAKE_BUILD_TYPE=Release -G "MinGW Makefiles" -H. -Bbuild

# Windows Visual Studio Developer Command Prompt
# emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles"  -H. -Bbuild

cmake --build build
cmake --install build [--prefix <sysroot>]
```
