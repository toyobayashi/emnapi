# emnapi

[![Build](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml/badge.svg?branch=main)](https://github.com/toyobayashi/emnapi/actions/workflows/main.yml)

适用于 [Emscripten](https://emscripten.org/index.html) 的 [Node-API (version 8)](https://nodejs.org/dist/latest-v16.x/docs/api/n-api.html) 实现，基于 Node.js v16.15.0

[查看文档](https://emnapi-docs.vercel.app/zh/guide/)

[完整的 API 列表](https://emnapi-docs.vercel.app/zh/reference/list.html)

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

使用 `emcc` 编译 `hello.c`，设置包含目录，用 `--js-library` 链接 JS 实现的库。

```bash
emcc -O3 \
     -I./node_modules/@tybys/emnapi/include \
     --js-library=./node_modules/@tybys/emnapi/dist/library_napi.js \
     -sALLOW_MEMORY_GROWTH=1 \
     -o hello.js \
     ./node_modules/@tybys/emnapi/src/emnapi.c \
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

也可以用官方的 C++ wrapper [`node-addon-api`](https://github.com/nodejs/node-addon-api)，它（v5.0.0）已被集成在这个包里，但不可使用 Node.js 环境特定的 API，如 `ThreadSafeFunction`, `AsyncWorker` 等等。

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
              Napi::Function::New(env, Method)).Check();
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)
```

使用 `em++` 编译 `hello.cpp`。Emscripten 默认禁用 C++ 异常，所以这里也预定义了 `-DNAPI_DISABLE_CPP_EXCEPTIONS` 和 `-DNODE_ADDON_API_ENABLE_MAYBE`。如果想启用 C++ 异常，请改用 `-sDISABLE_EXCEPTION_CATCHING=0` 并删掉 `.Check()` 调用。

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

然后使用输出的 JS。

### 使用 CMake

创建 `CMakeLists.txt`。

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

用 `emcmake` 构建，输出 `build/hello.js` 和 `build/hello.wasm`

```bash
mkdir build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -H. -Bbuild
cmake --build build
```

如果在 Windows 上未安装 `make`，请在 `Visual Studio Developer Command Prompt` 中跑下面的构建命令。

```bat
mkdir build
emcmake cmake -DCMAKE_BUILD_TYPE=Release -DCMAKE_MAKE_PROGRAM=nmake -G "NMake Makefiles" -H. -Bbuild
cmake --build build
```

完整的示例代码可以在[这里](https://github.com/toyobayashi/emnapi/tree/main/example)找到。

输出的代码可以运行在最近版本的现代浏览器和最新的 Node.js LTS 版本。不支持 IE。

如果在运行时初始化时抛出 JS 错误，Node.js 进程将会退出。可以使用`-sNODEJS_CATCH_EXIT=0` 并自己添加`uncaughtException`。或者可以使用 `Module.onEmnapiInitialized` 来捕获异常。

## Emnapi 运行时

大多数 API 都是用 JavaScript 实现的，它们依赖于 `library_napi.js` 库文件中提供的运行时代码。因此，如果要构建多个 wasm 目标，则相同的运行时代码将链接到每个 wasm 胶水 js 文件中。如果想要“动态链接”运行时代码，即在多个 wasm 之间共享运行时代码，可以这样做：

1. 安装 emnapi 运行时

    ```bash
    npm install @tybys/emnapi-runtime
    ```

2. 链接无运行时的库文件

    - emcc

      ```bash
      emcc ... --js-library=./node_modules/@tybys/emnapi/dist/library_napi_no_runtime.js
      ```

    - cmake

      ```cmake
      add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/@tybys/emnapi")
      target_link_libraries(hello emnapi_noruntime)
      ```

3. 导入运行时

    - 浏览器

        ```html
        <script src="node_modules/@tybys/emnapi-runtime/dist/emnapi.min.js"></script>
        <script src="your-wasm-glue.js"></script>
        ```
    
    - Node.js

        Just npm install `@tybys/emnapi-runtime` 

    也可以显式指定 `emnapiRuntime`，这一步是可选的：

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

`@tybys/emnapi-runtime` 版本应与 `@tybys/emnapi` 版本保持一致。

## 构建

```bash
git clone https://github.com/toyobayashi/emnapi.git
cd ./emnapi
npm install
npm run build # output ./packages/*/dist

# test
npm run rebuild:test
npm test
```
