# emnapi

[Node-API (v14.16.0)](https://nodejs.org/docs/v14.16.0/api/n-api.html) implementation for [Emscripten](https://emscripten.org/index.html)

Only APIs in `js_native_api.h` are implemented.

[中文 README](https://github.com/toyobayashi/emnapi/tree/main/README_CN.md).

## Quick Start

You will need to install:

* Node.js latest LTS
* Emscripten tool chain v2.0.2+
* CMake v3.9+
* make / nmake (Windows only)

Set `$EMSDK` environment variable to the emsdk root path.

Make sure `emcc` / `em++` / `cmake` / `make` can be found in `$PATH`.

If you have not installed `make` on Windows, you can also execute build commands in `Visual Studio Developer Command Prompt`.

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

Compile `hello.c` using `emcc`, set include directory, link napi js implementation with `--js-library`, and `_malloc` and `_free` should be exported.

```bash
emcc -O3 \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sALLOW_MEMORY_GROWTH=1 \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -o hello.js \
     hello.c
```

Use the output js in html. The default export key is `emnapiExports` on [`Module`](https://emscripten.org/docs/api_reference/module.html) object. You can change the key by predefining `NODE_GYP_MODULE_NAME`.

```html
<script src="hello.js"></script>
<script>
// Emscripten js glue code will create a global `Module` object
Module.onRuntimeInitialized = function () {
  var binding = Module.emnapiExports;
  var msg = 'hello ' + binding.hello();
  window.alert(msg);
};
</script>
```

Or in Node.js.

```js
const Module = require('./hello.js')

Module.onRuntimeInitialized = function () {
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

Compile `hello.cpp` using `em++`. Exception is disabled by Emscripten default, so predefine `NAPI_DISABLE_CPP_EXCEPTIONS` here.

```bash
em++ -O3 \
     -DNAPI_DISABLE_CPP_EXCEPTIONS \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sALLOW_MEMORY_GROWTH=1 \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -o hello.js \
     hello.cpp
```

Then use the output js.

### Using CMake

Create `CMakeLists.txt`.

```cmake
cmake_minimum_required(VERSION 3.9)

project(emnapiexample)

add_executable(hello hello.c)
# or add_executable(hello hello.cpp)

execute_process(COMMAND node -p "require('@tybys/emnapi').include"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE EMNAPI_INCLUDE_DIR
)
string(REGEX REPLACE "[\r\n\"]" "" EMNAPI_INCLUDE_DIR ${EMNAPI_INCLUDE_DIR})

execute_process(COMMAND node -p "require('@tybys/emnapi').js_library"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE EMNAPI_JS_LIBRARY
)
string(REGEX REPLACE "[\r\n\"]" "" EMNAPI_JS_LIBRARY ${EMNAPI_JS_LIBRARY})

message(${EMNAPI_INCLUDE_DIR})
message(${EMNAPI_JS_LIBRARY})

target_include_directories(hello PRIVATE ${EMNAPI_INCLUDE_DIR})
target_link_options(hello PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sNODEJS_CATCH_EXIT=0"
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "--js-library=${EMNAPI_JS_LIBRARY}"
)
```

Building with `emcmake`, output `build/hello.js` and `build/hello.wasm`.

```bash
mkdir build
cd build
emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build .
cd ..
```

If you have not installed `make` on Windows, execute commands below in `Visual Studio Developer Command Prompt`.

```bat
mkdir build
cd build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" ..
cmake --build .
cd ..
```

Full example codes can be found in [here](https://github.com/toyobayashi/emnapi/tree/main/example).

Output code can run in recent version modern browsers and Node.js latest LTS. IE is not supported.

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

- [x] ~~napi_create_external_arraybuffer~~
- [x] ~~napi_adjust_external_memory~~
- [x] ~~napi_detach_arraybuffer~~
- [x] ~~napi_is_detached_arraybuffer~~

### Limited

* These APIs require [FinalizationRegistry](https://www.caniuse.com/?search=FinalizationRegistry) and [WeakRef](https://www.caniuse.com/?search=WeakRef) (v8 engine v8.4+ / Node.js v14.6.0+)

  - [x] ***napi_wrap***
  - [x] ***napi_unwrap***
  - [x] ***napi_remove_wrap***
  - [x] ***napi_create_external***
  - [x] ***napi_get_value_external***
  - [x] ***napi_create_reference***
  - [x] ***napi_delete_reference***
  - [x] ***napi_reference_ref***
  - [x] ***napi_reference_unref***
  - [x] ***napi_get_reference_value***
  - [x] ***napi_add_finalizer***

* These APIs require [BigInt](https://www.caniuse.com/?search=BigInt) (v8 engine v6.7+ / Node.js v10.4.0+)

  - [x] ***napi_create_bigint_int64***
  - [x] ***napi_create_bigint_uint64***
  - [x] ***napi_create_bigint_words***
  - [x] ***napi_get_value_bigint_int64***
  - [x] ***napi_get_value_bigint_uint64***
  - [x] ***napi_get_value_bigint_words***

* These APIs always return `NULL` data pointer (No way to implement in JS)

  - [x] ***napi_create_arraybuffer***
  - [x] ***napi_get_arraybuffer_info***
  - [x] ***napi_get_typedarray_info***
  - [x] ***napi_get_dataview_info***

### Stable

- [x] napi_get_last_error_info
- [x] napi_get_undefined
- [x] napi_get_null
- [x] napi_get_global
- [x] napi_get_boolean
- [x] napi_create_object
- [x] napi_create_array
- [x] napi_create_array_with_length
- [x] napi_create_double
- [x] napi_create_int32
- [x] napi_create_uint32
- [x] napi_create_int64
- [x] napi_create_string_latin1
- [x] napi_create_string_utf8
- [x] napi_create_string_utf16
- [x] napi_create_symbol
- [x] napi_create_function
- [x] napi_create_error
- [x] napi_create_type_error
- [x] napi_create_range_error
- [x] napi_typeof
- [x] napi_get_value_double
- [x] napi_get_value_int32
- [x] napi_get_value_uint32
- [x] napi_get_value_int64
- [x] napi_get_value_bool
- [x] napi_get_value_string_latin1
- [x] napi_get_value_string_utf8
- [x] napi_get_value_string_utf16
- [x] napi_coerce_to_bool
- [x] napi_coerce_to_number
- [x] napi_coerce_to_object
- [x] napi_coerce_to_string
- [x] napi_get_prototype
- [x] napi_get_property_names
- [x] napi_set_property
- [x] napi_has_property
- [x] napi_get_property
- [x] napi_delete_property
- [x] napi_has_own_property
- [x] napi_set_named_property
- [x] napi_has_named_property
- [x] napi_get_named_property
- [x] napi_set_element
- [x] napi_has_element
- [x] napi_get_element
- [x] napi_delete_element
- [x] napi_define_properties
- [x] napi_is_array
- [x] napi_get_array_length
- [x] napi_strict_equals
- [x] napi_call_function
- [x] napi_new_instance
- [x] napi_instanceof
- [x] napi_get_cb_info
- [x] napi_get_new_target
- [x] napi_define_class
- [x] napi_open_handle_scope
- [x] napi_close_handle_scope
- [x] napi_open_escapable_handle_scope
- [x] napi_close_escapable_handle_scope
- [x] napi_escape_handle
- [x] napi_throw
- [x] napi_throw_error
- [x] napi_throw_type_error
- [x] napi_throw_range_error
- [x] napi_is_error
- [x] napi_is_exception_pending
- [x] napi_get_and_clear_last_exception
- [x] napi_is_arraybuffer
- [x] napi_is_typedarray
- [x] napi_create_typedarray
- [x] napi_create_dataview
- [x] napi_is_dataview
- [x] napi_get_version
- [x] napi_create_promise
- [x] napi_resolve_deferred
- [x] napi_reject_deferred
- [x] napi_is_promise
- [x] napi_run_script
- [x] napi_create_date
- [x] napi_is_date
- [x] napi_get_date_value
- [x] napi_get_all_property_names
- [x] napi_set_instance_data
- [x] napi_get_instance_data
- [x] napi_object_freeze
- [x] napi_object_seal
- [x] napi_type_tag_object
- [x] napi_check_object_type_tag
