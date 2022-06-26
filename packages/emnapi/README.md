# emnapi

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

[Node-API (version 8)](https://nodejs.org/docs/v16.15.0/api/n-api.html) implementation for [Emscripten](https://emscripten.org/index.html), based on Node.js v16.15.0.

[中文 README](https://github.com/toyobayashi/emnapi/tree/main/packages/emnapi/README_CN.md).

[See documentation for more details](https://emnapi-docs.vercel.app/guide/)

[Full API List](https://emnapi-docs.vercel.app/reference/list.html)

[How to build Node-API official examples](https://github.com/toyobayashi/node-addon-examples)

## Quick Start

You will need to install:

* Node.js latest LTS (recommend v14.6.0+)
* Emscripten tool chain v2.0.2+
* CMake v3.9+
* make / nmake (Windows only)

Set `$EMSDK` environment variable to the emsdk root path.

Make sure `emcc` / `em++` / `cmake` / `make` can be found in `$PATH`.

If you have not installed [make](https://github.com/toyobayashi/make-win-build/releases) on Windows, you can also execute build commands in [Visual Studio Developer Command Prompt](https://visualstudio.microsoft.com/visual-cpp-build-tools/) where `nmake` is available.

### NPM Install

```bash
npm install -D @tybys/emnapi
```

### Using C

Create `hello.c`.

```c
#include <node_api.h>
#include <string.h>

#define GET_AND_THROW_LAST_ERROR(env)                                    \
  do {                                                                   \
    const napi_extended_error_info *error_info;                          \
    napi_get_last_error_info((env), &error_info);                        \
    bool is_pending;                                                     \
    const char* err_message = error_info->error_message;                 \
    napi_is_exception_pending((env), &is_pending);                       \
    if (!is_pending) {                                                   \
      const char* error_message = err_message != NULL ?                  \
        err_message :                                                    \
        "empty error message";                                           \
      napi_throw_error((env), NULL, error_message);                      \
    }                                                                    \
  } while (0)

#define NAPI_CALL_BASE(env, the_call, ret_val)                           \
  do {                                                                   \
    if ((the_call) != napi_ok) {                                         \
      GET_AND_THROW_LAST_ERROR((env));                                   \
      return ret_val;                                                    \
    }                                                                    \
  } while (0)

#define NAPI_CALL(env, the_call)                                         \
  NAPI_CALL_BASE(env, the_call, NULL)

#define DECLARE_NAPI_PROPERTY(name, func)                                \
  { (name), NULL, (func), NULL, NULL, NULL, napi_default, NULL }

static napi_value Method(napi_env env, napi_callback_info info) {
  napi_value world;
  const char* str = "world";
  size_t str_len = strlen(str);
  NAPI_CALL(env, napi_create_string_utf8(env, str, str_len, &world));
  return world;
}

NAPI_MODULE_INIT() {
  napi_property_descriptor desc = DECLARE_NAPI_PROPERTY("hello", Method);
  NAPI_CALL(env, napi_define_properties(env, exports, 1, &desc));
  return exports;
}
```

Compile `hello.c` using `emcc`, set include directory, link napi js implementation with `--js-library`.

```bash
emcc -O3 \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -sALLOW_MEMORY_GROWTH=1 \
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

Or in Node.js.

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

Compile `hello.cpp` using `em++`. C++ exception is disabled by Emscripten default, so predefine `-DNAPI_DISABLE_CPP_EXCEPTIONS` and `-DNODE_ADDON_API_ENABLE_MAYBE` here. If you would like to enable C++ exception, use `-sDISABLE_EXCEPTION_CATCHING=0` instead and remove `.Check()` call.

```bash
em++ -O3 \
     -DNAPI_DISABLE_CPP_EXCEPTIONS \
     -DNODE_ADDON_API_ENABLE_MAYBE \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -sALLOW_MEMORY_GROWTH=1 \
     -o hello.js \
     ./node_modules/@tybys/emnapi/src/emnapi.c \
     hello.cpp
```

Then use the output js.

### Using CMake

Create `CMakeLists.txt`.

```cmake
cmake_minimum_required(VERSION 3.9)

project(emnapiexample)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")

add_executable(hello hello.c)
# or add_executable(hello hello.cpp)

target_link_libraries(hello emnapi)
target_link_options(hello PRIVATE
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "-sALLOW_MEMORY_GROWTH=1"
  "-sNODEJS_CATCH_EXIT=0"
)
```

Building with `emcmake`, output `build/hello.js` and `build/hello.wasm`.

```bash
mkdir build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -H. -Bbuild
cmake --build build
```

If you have not installed `make` on Windows, execute commands below in `Visual Studio Developer Command Prompt`.

```bat
mkdir build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" -H. -Bbuild
cmake --build build
```

Full example codes can be found [here](https://github.com/toyobayashi/emnapi/tree/main/example).

Output code can run in recent version modern browsers and Node.js latest LTS. IE is not supported.

If a JS error is thrown on runtime initialization, Node.js process will exit. You can use `-sNODEJS_CATCH_EXIT=0` and add `ununcaughtException` handler yourself to avoid this. Alternatively, you can use `Module.onEmnapiInitialized` callback to catch error.

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
```
