# emnapi

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

适用于 [Emscripten](https://emscripten.org/index.html) 的 [Node-API (v14.16.0)](https://nodejs.org/dist/latest-v14.x/docs/api/n-api.html) 实现。

## 快速开始

环境准备：

* Node.js 最新 LTS (建议 v14.6.0 以上)
* Emscripten 工具链 v2.0.2+
* CMake v3.9+
* make / nmake (仅Windows)

设置 `$EMSDK` 环境变量为 emsdk 根目录，并确保 Emscripten 工具链二进制目录（`$EMSDK/upstream/emscripten`）和 CMake 在 `$PATH` 里

未安装 [make](https://github.com/toyobayashi/make-win-build/releases) 的 Windows 用户请使用 [Visual Studio Developer Command Prompt](https://visualstudio.microsoft.com/visual-cpp-build-tools/) 跑命令，因为这里面可以用到 `nmake` 作为替代

### NPM Install

```bash
npm install -D @tybys/emnapi
```

### 使用 C 语言

创建 `hello.c`。

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

使用 `emcc` 编译 `hello.c`，设置包含目录，用 `--js-library` 链接 JS 实现的库，并将 `_malloc` 和 `_free` 导出。

```bash
emcc -O3 \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sALLOW_MEMORY_GROWTH=1 \
     -sEXPORTED_FUNCTIONS=['_malloc','_free'] \
     -o hello.js \
     hello.c
```

把输出的 JS 引入进 HTML 使用，默认导出在 [`Module`](https://emscripten.org/docs/api_reference/module.html) 对象上的 `emnapiExports`。可通过预定义 `NODE_GYP_MODULE_NAME` 修改默认的导出键值。`onEmnapiInitialized` 将在 `onRuntimeInitialized` 之前被调用。

```html
<script src="hello.js"></script>
<script>
// Emscripten js 胶水代码会在全局创建一个 `Module` 对象
Module.onEmnapiInitialized = function (err, emnapiExports) {
  if (err) {
    // 错误处理
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

或在 Node.js 中使用。

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

### 使用 C++ 语言

也可以用官方的 C++ wrapper [`node-addon-api`](https://github.com/nodejs/node-addon-api)，它已被集成在这个包里，但不可使用 Node.js 环境特定的 API，如 `ThreadSafeFunction`, `AsyncWorker` 等等。

**特别注意: 使用 C++ wrapper 编译出的代码只能运行在 Node.js v14.6.0+ 和支持 `FinalizationRegistry` 和 `WeakRef` 的现代浏览器（[v8 引擎 v8.4+](https://v8.dev/blog/v8-release-84))！**

创建 `hello.cpp`。

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

使用 `em++` 编译 `hello.cpp`。Emscripten 默认禁用 C++ 异常，所以这里也预定义了 `NAPI_DISABLE_CPP_EXCEPTIONS`。如果想启用 C++ 异常，请使用 `-sDISABLE_EXCEPTION_CATCHING=0` 代替 `-DNAPI_DISABLE_CPP_EXCEPTIONS`。

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

然后使用输出的 JS。

### 使用 CMake

创建 `CMakeLists.txt`。

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

target_include_directories(hello PRIVATE ${EMNAPI_INCLUDE_DIR})
target_link_options(hello PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sNODEJS_CATCH_EXIT=0"
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "--js-library=${EMNAPI_JS_LIBRARY}"
)
```

用 `emcmake` 构建，输出 `build/hello.js` 和 `build/hello.wasm`

```bash
mkdir build
cd build
emcmake cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build .
cd ..
```

如果在 Windows 上未安装 `make`，请在 `Visual Studio Developer Command Prompt` 中跑下面的构建命令。

```bat
mkdir build
cd build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" ..
cmake --build .
cd ..
```

完整的示例代码可以在[这里](https://github.com/toyobayashi/emnapi/tree/main/example)找到。

输出的代码可以运行在最近版本的现代浏览器和最新的 Node.js LTS 版本。不支持 IE。

如果在运行时初始化时抛出 JS 错误，Node.js 进程将会退出。可以使用`-sNODEJS_CATCH_EXIT=0` 并自己添加`uncaughtException`。或者可以使用 `Module.onEmnapiInitialized` 来捕获异常。

## 构建

```bash
git clone https://github.com/toyobayashi/emnapi.git
cd ./emnapi
npm install
npm run build:lib # 输出 ./dist/library_napi.js

# test
npm run rebuild
npm test
```

## API 列表

### 不支持的 API

以下 API 不可实现，调用后将永远返回 `napi_generic_failure` 状态。

- ~~napi_create_external_arraybuffer~~ (使用 [`emnapi_create_external_uint8array`][] 代替)
- ~~napi_adjust_external_memory~~
- ~~napi_detach_arraybuffer~~
- ~~napi_is_detached_arraybuffer~~

### 能力受限的 API

* 以下 API 需要 [FinalizationRegistry](https://www.caniuse.com/?search=FinalizationRegistry) 和 [WeakRef](https://www.caniuse.com/?search=WeakRef) (v8 引擎 v8.4+ / Node.js v14.6.0+)，否则返回 `napi_generic_failure` 状态。

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

* 以下 API 需要 [BigInt](https://www.caniuse.com/?search=BigInt) (v8 引擎 v6.7+ / Node.js v10.4.0+)，否则返回 `napi_generic_failure` 状态。

  - ***napi_create_bigint_int64***
  - ***napi_create_bigint_uint64***
  - ***napi_create_bigint_words***
  - ***napi_get_value_bigint_int64***
  - ***napi_get_value_bigint_uint64***
  - ***napi_get_value_bigint_words***

* `data` 指针返回值永远为 `NULL` 的 API：(JS 无法实现)

  - ***napi_create_arraybuffer***
  - ***napi_get_arraybuffer_info***
  - ***napi_get_typedarray_info***
  - ***napi_get_dataview_info***

### 稳定的 API

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

### 额外新增的 API

以下 API 在 `emnapi.h` 头文件中。

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
