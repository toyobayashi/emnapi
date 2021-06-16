# emnapi

适用于 [Emscripten](https://emscripten.org/index.html) 的 [Node-API (v14.16.0)](https://nodejs.org/dist/latest-v14.x/docs/api/n-api.html) 实现。

仅实现了 `js_native_api.h` 中的 API。

## 快速开始

环境准备：

* Node.js 最新 LTS
* Emscripten 工具链 v2.0.2+
* CMake v3.9+
* make / nmake (仅Windows)

设置 `$EMSDK` 环境变量为 emsdk 根目录，并确保 Emscripten 工具链二进制目录（`$EMSDK/upstream/emscripten`）和 CMake 在 `$PATH` 里

未安装 `make` 的 Windows 用户请使用 Visual Studio Developer Command Prompt 跑命令（需要用到 `nmake`）

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

把输出的 JS 引入进 HTML 使用，默认导出在 [`Module`](https://emscripten.org/docs/api_reference/module.html) 对象上的 `emnapiExports`。可通过预定义 `NODE_GYP_MODULE_NAME` 修改默认的导出键值。

```html
<script src="hello.js"></script>
<script>
// Emscripten js 胶水代码会在全局创建一个 `Module` 对象
Module.onRuntimeInitialized = function () {
  var binding = Module.emnapiExports;
  var msg = 'hello ' + binding.hello();
  window.alert(msg);
};
</script>
```

或在 Node.js 中使用。

```js
const Module = require('./hello.js')

Module.onRuntimeInitialized = function () {
  const binding = Module.emnapiExports
  const msg = `hello ${binding.hello()}`
  console.log(msg)
}
```

### 使用 C++ 语言

也可以用官方的 C++ wrapper [`node-addon-api`](https://github.com/nodejs/node-addon-api)，它已被集成在这个包里，但不可使用 Node.js 环境特定的 API，如 `ThreadSafeFunction`, `AsyncWorker` 等等。

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

使用 `em++` 编译 `hello.cpp`。Emscripten 默认禁用 C++ 异常，所以这里也预定义了 `NAPI_DISABLE_CPP_EXCEPTIONS`。

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

- [x] ~~napi_create_external_arraybuffer~~
- [x] ~~napi_adjust_external_memory~~
- [x] ~~napi_detach_arraybuffer~~
- [x] ~~napi_is_detached_arraybuffer~~

### 能力受限的 API

* 需要 [FinalizationRegistry](https://www.caniuse.com/?search=FinalizationRegistry) 和 [WeakRef](https://www.caniuse.com/?search=WeakRef) 的 API：

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

* `data` 指针返回值永远为 `NULL` 的 API：

  - [x] ***napi_create_arraybuffer***
  - [x] ***napi_get_arraybuffer_info***
  - [x] ***napi_get_typedarray_info***
  - [x] ***napi_get_dataview_info***

* 需要 [BigInt](https://www.caniuse.com/?search=BigInt) 的 API：

  - [x] ***napi_create_bigint_int64***
  - [x] ***napi_create_bigint_uint64***
  - [x] ***napi_create_bigint_words***
  - [x] ***napi_get_value_bigint_int64***
  - [x] ***napi_get_value_bigint_uint64***
  - [x] ***napi_get_value_bigint_words***

### 稳定的 API

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
