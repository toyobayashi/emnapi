# Contribute to emnapi

Please feel free to open an issue or PR anytime.

This doc will explain the structure of this project and some points need to note before contributing.

## Packages

- `packages/emnapi` (`devDependencies`)

    The main package of emnapi, including all Node-API implementation, emnapi C headers, CMake configurations, and
    the [Emscripten JavaScript library](https://emscripten.org/docs/porting/connecting_cpp_and_javascript/Interacting-with-code.html#implement-a-c-api-in-javascript) build. We finally need to build a Emscripten JavaScript library file
    which is designed for being used in link time. The library file is not a regular JavaScript file,
    it may contain some macros wrapped in `{{{  }}}` only available in Emscripten, and can not use ES Module format.
    Fortunately, we can write ESM code during development and then build the final library file through
    TypeScript custom transformers those are also in this repo.

    For example, write the following source code:

    ```ts
    import { makeSetValue } from 'emscripten:parse-tools'

    /** @__sig vp */
    export function foo (result: number) {
      makeSetValue('result', 0, 0, 'i32')
    }
    ```

    This will output:

    ```js
    function _foo (result) {
      {{{ makeSetValue('result', 0, 0, 'i32') }}}
    }
    addToLibrary({
      foo: _foo,
      foo__sig: 'vp'
    })
    ```

    It is powered by `packages/rollup-plugin-emscripten-esm-library` and `packages/ts-transform-emscripten-esm-library`.

    In addition, macros are also heavily used in `packages/emnapi` to match the Node.js source as much as possible.

    ```ts
    import { $CHECK_ARG, $CHECK_ENV_NOT_IN_GC } from '...'

    /** @__sig ipip */
    export function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>): napi_status {
      const envObject: Env = $CHECK_ENV_NOT_IN_GC!(env)
      $CHECK_ARG!(envObject, result)
      // ...
    }
    ```

    Macros are powered by `packages/ts-transform-macro`

- `packages/core` (`dependencies`)

    This package is designed for using emnapi on non-Emscripten platform, it is a trasformed output of `packages/emnapi`
    by using `packages/ts-transform-emscripten-parse-tools`.
    
    For common WebAssembly loading case, we can't use the Emscripten JavaScript library file built in `packages/emnapi` package.
    We need to manually provide imported symbols to the second parameter of `WebAssembly.instantiate`,
    so this is the use case of this package.

- `packages/runtime` (`dependencies`)

    Provide runtime implementation of `napi_value` / `napi_handle_scope` / `napi_ref` etc.

- `packages/node` (`dependencies`)

    Some APIs make sense on Node.js only, such as `napi_async_init`, `napi_async_destroy` and `napi_make_callback`.
    This package provide native Node.js bindings for JavaScript implementation as bridge.

## Environment Requirements

- Node.js `>= 16`
- npm `>= 8`
- `npm install -g node-gyp`
- [Emscripten](https://github.com/emscripten-core/emscripten) `>= 3.1.9`, `EMSDK` environment variable
- [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) `latest`, `WASI_SDK_PATH` environment variable
- [CMake](https://github.com/Kitware/CMake) `>= 3.13`
- [ninja-build](https://github.com/ninja-build/ninja)

## Debugging

- Run `npm run build` to build packages
- Open `packages/test/**/*.js`
- Add break points
- Launch `Launch Test` VSCode launch configuration
- Input `UV_THREADPOOL_SIZE` environment variable
- Select target tripple
