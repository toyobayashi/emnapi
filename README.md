# emnapi

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

[Node-API (version 8)](https://nodejs.org/docs/v16.13.0/api/n-api.html) implementation for [Emscripten](https://emscripten.org/index.html)

[中文 README](https://github.com/toyobayashi/emnapi/tree/main/README_CN.md).

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
    napi_is_exception_pending((env), &is_pending);                       \
    if (!is_pending) {                                                   \
      const char* error_message = error_info->error_message != NULL ?    \
        error_info->error_message :                                      \
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

Alternatively, you can also use [`node-addon-api`](https://github.com/nodejs/node-addon-api) which is official Node-API C++ wrapper, already shipped in this package but without Node.js specific API such as `ThreadSafeFunction`, `AsyncWorker`, etc.

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
              Napi::Function::New(env, Method));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
```

Compile `hello.cpp` using `em++`. C++ exception is disabled by Emscripten default, so predefine `NAPI_DISABLE_CPP_EXCEPTIONS` and `NODE_ADDON_API_ENABLE_MAYBE` here. If you would like to enable C++ exception, use `-sDISABLE_EXCEPTION_CATCHING=0` instead of `-DNAPI_DISABLE_CPP_EXCEPTIONS`.

```bash
em++ -O3 \
     -DNAPI_DISABLE_CPP_EXCEPTIONS \
     -DNODE_ADDON_API_ENABLE_MAYBE \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
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

## Building

```bash
git clone https://github.com/toyobayashi/emnapi.git
cd ./emnapi
npm install
npm run build:lib # output ./dist/library_napi.js

# test
npm run rebuild
npm test
```

## API List

### Unavailable

These APIs always return `napi_generic_failure`.

- ~~napi_create_external_arraybuffer~~ (use [`emnapi_create_external_uint8array`][] instead)
- ~~napi_adjust_external_memory~~
- ~~napi_detach_arraybuffer~~
- ~~napi_is_detached_arraybuffer~~

### Limited

* These APIs require [FinalizationRegistry](https://www.caniuse.com/?search=FinalizationRegistry) and [WeakRef](https://www.caniuse.com/?search=WeakRef) (v8 engine v8.4+ / Node.js v14.6.0+), else return `napi_generic_failure`

  - ***napi_wrap***
  - ***napi_unwrap***
  - ***napi_remove_wrap***
  - ***napi_create_external***
  - ***napi_get_value_external***
  - ***napi_create_reference***
  - ***napi_delete_reference***
  - ***napi_reference_ref***
  - ***napi_reference_unref***
  - ***napi_get_reference_value***
  - ***napi_add_finalizer***

* These APIs require [BigInt](https://www.caniuse.com/?search=BigInt) (v8 engine v6.7+ / Node.js v10.4.0+), else return `napi_generic_failure`

  - ***napi_create_bigint_int64***
  - ***napi_create_bigint_uint64***
  - ***napi_create_bigint_words***
  - ***napi_get_value_bigint_int64***
  - ***napi_get_value_bigint_uint64***
  - ***napi_get_value_bigint_words***

* These APIs may return `NULL` data pointer

  - ***napi_create_arraybuffer*** (No way to implement in JS)
  - ***napi_get_arraybuffer_info*** (Require `FinalizationRegistry`, data is a copy in wasm memory)
  - ***napi_get_typedarray_info*** (Require `FinalizationRegistry`, data is a copy in wasm memory)
  - ***napi_get_dataview_info*** (Require `FinalizationRegistry`, data is a copy in wasm memory)

### Stable

- napi_get_last_error_info
- napi_get_undefined
- napi_get_null
- napi_get_global
- napi_get_boolean
- napi_create_object
- napi_create_array
- napi_create_array_with_length
- napi_create_double
- napi_create_int32
- napi_create_uint32
- napi_create_int64
- napi_create_string_latin1
- napi_create_string_utf8
- napi_create_string_utf16
- napi_create_symbol
- napi_create_function
- napi_create_error
- napi_create_type_error
- napi_create_range_error
- napi_typeof
- napi_get_value_double
- napi_get_value_int32
- napi_get_value_uint32
- napi_get_value_int64
- napi_get_value_bool
- napi_get_value_string_latin1
- napi_get_value_string_utf8
- napi_get_value_string_utf16
- napi_coerce_to_bool
- napi_coerce_to_number
- napi_coerce_to_object
- napi_coerce_to_string
- napi_get_prototype
- napi_get_property_names
- napi_set_property
- napi_has_property
- napi_get_property
- napi_delete_property
- napi_has_own_property
- napi_set_named_property
- napi_has_named_property
- napi_get_named_property
- napi_set_element
- napi_has_element
- napi_get_element
- napi_delete_element
- napi_define_properties
- napi_is_array
- napi_get_array_length
- napi_strict_equals
- napi_call_function
- napi_new_instance
- napi_instanceof
- napi_get_cb_info
- napi_get_new_target
- napi_define_class
- napi_open_handle_scope
- napi_close_handle_scope
- napi_open_escapable_handle_scope
- napi_close_escapable_handle_scope
- napi_escape_handle
- napi_throw
- napi_throw_error
- napi_throw_type_error
- napi_throw_range_error
- napi_is_error
- napi_is_exception_pending
- napi_get_and_clear_last_exception
- napi_is_arraybuffer
- napi_is_typedarray
- napi_create_typedarray
- napi_create_dataview
- napi_is_dataview
- napi_get_version
- napi_create_promise
- napi_resolve_deferred
- napi_reject_deferred
- napi_is_promise
- napi_run_script
- napi_create_date
- napi_is_date
- napi_get_date_value
- napi_get_all_property_names
- napi_set_instance_data
- napi_get_instance_data
- napi_object_freeze
- napi_object_seal
- napi_type_tag_object
- napi_check_object_type_tag
- napi_fatal_error (`node_api.h`)
- napi_get_node_version (`node_api.h`)

### Additional

These APIs are in `emnapi.h`.

#### emnapi_get_module_object

```c
napi_status emnapi_get_module_object(napi_env env,
                                     napi_value* result);
```

* `[in] env`: The environment that the API is invoked under.
* `[out] result`: A `napi_value` representing the `Module` object of Emscripten.

Returns `napi_ok` if the API succeeded.

#### emnapi_get_module_property

```c
napi_status emnapi_get_module_property(napi_env env,
                                       const char* utf8name,
                                       napi_value* result);
```

* `[in] env`: The environment that the API is invoked under.
* `[in] utf8Name`: The name of the `Module` property to get.
* `[out] result`: The value of the property.

Returns `napi_ok` if the API succeeded.

#### emnapi_create_external_uint8array

```c
napi_status emnapi_create_external_uint8array(napi_env env,
                                              void* external_data,
                                              size_t byte_length,
                                              napi_finalize finalize_cb,
                                              void* finalize_hint,
                                              napi_value* result);
```

* `[in] env`: The environment that the API is invoked under.
* `[in] external_data`: Pointer to the underlying byte buffer of the
  `Uint8Array`.
* `[in] byte_length`: The length in bytes of the underlying buffer.
* `[in] finalize_cb`: Optional callback to call when the `Uint8Array` is being
  collected.
* `[in] finalize_hint`: Optional hint to pass to the finalize callback during
  collection.
* `[out] result`: A `napi_value` representing a JavaScript `Uint8Array`.

Returns `napi_ok` if the API succeeded.
Returns `napi_generic_failure` if `FinalizationRegistry` or `WeakRef` is not supported.

This API returns an N-API value corresponding to a JavaScript `Uint8Array`.
The underlying byte buffer of the `Uint8Array` is externally allocated and
managed. The caller must ensure that the byte buffer remains valid until the
finalize callback is called.

#### emnapi_get_emscripten_version

```c
typedef struct {
  uint32_t major;
  uint32_t minor;
  uint32_t patch;
} emnapi_emscripten_version;

napi_status emnapi_get_emscripten_version(napi_env env,
                                          const emnapi_emscripten_version** version);
```

* `[in] env`: The environment that the API is invoked under.
* `[out] version`: A pointer to version information for Emscripten itself.

Returns `napi_ok` if the API succeeded.

This function fills the version struct with the major, minor, and patch version of Emscripten that is used for compiling current wasm module. 

The returned buffer does not need to be freed.

[`emnapi_create_external_uint8array`]: #emnapi_create_external_uint8array
