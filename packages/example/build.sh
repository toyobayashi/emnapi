#!/bin/bash

mkdir -p out/emscripten
mkdir -p out/wasi-sdk

$EMSDK/upstream/emscripten/emcc -O3 \
    -pthread \
    -DBUILDING_NODE_EXTENSION \
    "-DNAPI_EXTERN=__attribute__((__import_module__(\"env\")))" \
    -I./node_modules/emnapi/include/node \
    -L./node_modules/emnapi/lib/wasm32-emscripten \
    --js-library=./node_modules/emnapi/dist/library_napi.js \
    -sWASM_BIGINT=1 \
    -sALLOW_MEMORY_GROWTH=1 \
    -sALLOW_TABLE_GROWTH=1 \
    -sMIN_CHROME_VERSION=85 \
    -sEXPORTED_FUNCTIONS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_FUNCTIONS)") \
    -sEXPORTED_RUNTIME_METHODS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_RUNTIME_METHODS)") \
    -sEXPORT_ES6=1 \
    -sPTHREAD_POOL_SIZE=4 \
    -o out/emscripten/binding.js \
    binding.c \
    -lemnapi-mt

$WASI_SDK_PATH/bin/clang --target=wasm32-wasip1-threads -O3 \
    -pthread -matomics -mbulk-memory \
    -DBUILDING_NODE_EXTENSION \
    -I./node_modules/emnapi/include/node \
    -L./node_modules/emnapi/lib/wasm32-wasip1-threads \
    --sysroot=$WASI_SDK_PATH/share/wasi-sysroot \
    -mexec-model=reactor \
    -Wl,--initial-memory=16777216 \
    -Wl,--max-memory=4294967296 \
    -Wl,--export=malloc \
    -Wl,--export=free \
    -Wl,--export=napi_register_wasm_v1 \
    -Wl,--export=emnapi_create_env \
    -Wl,--export=emnapi_delete_env \
    -Wl,--export-if-defined=node_api_module_get_api_version_v1 \
    -Wl,--export-if-defined=emnapi_thread_crashed \
    -Wl,--export-if-defined=uv_library_shutdown \
    -Wl,--import-undefined \
    -Wl,--import-memory \
    -Wl,--shared-memory \
    -Wl,--export-memory \
    -Wl,--export-table \
    -Wl,--growable-table \
    -o out/wasi-sdk/binding.wasm \
    binding.c \
    -lemnapi-mt

$EMSDK/upstream/emscripten/em++ -O3 \
    -pthread \
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
    -sMIN_CHROME_VERSION=85 \
    -sEXPORTED_FUNCTIONS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_FUNCTIONS)") \
    -sEXPORTED_RUNTIME_METHODS=$(node -p "JSON.stringify(require('emnapi').requiredConfig.emscripten.settings.EXPORTED_RUNTIME_METHODS)") \
    -sEXPORT_ES6=1 \
    -sPTHREAD_POOL_SIZE=4 \
    -sDISABLE_EXCEPTION_CATCHING=0 \
    -o out/emscripten/binding-naa.js \
    binding.cpp \
    -lemnapi-mt

$WASI_SDK_PATH/bin/clang++ --target=wasm32-wasip1-threads -O3 \
    -pthread -matomics -mbulk-memory -fno-exceptions \
    -DBUILDING_NODE_EXTENSION \
    -DNAPI_DISABLE_CPP_EXCEPTIONS \
    -I./node_modules/emnapi/include/node \
    -I$(node -p "require('node-addon-api').include_dir") \
    -L./node_modules/emnapi/lib/wasm32-wasip1-threads \
    --sysroot=$WASI_SDK_PATH/share/wasi-sysroot \
    -mexec-model=reactor \
    -Wl,--initial-memory=16777216 \
    -Wl,--max-memory=4294967296 \
    -Wl,--export=malloc \
    -Wl,--export=free \
    -Wl,--export=napi_register_wasm_v1 \
    -Wl,--export=emnapi_create_env \
    -Wl,--export=emnapi_delete_env \
    -Wl,--export-if-defined=node_api_module_get_api_version_v1 \
    -Wl,--export-if-defined=emnapi_thread_crashed \
    -Wl,--export-if-defined=uv_library_shutdown \
    -Wl,--import-undefined \
    -Wl,--import-memory \
    -Wl,--shared-memory \
    -Wl,--export-memory \
    -Wl,--export-table \
    -Wl,--growable-table \
    -o out/wasi-sdk/binding-naa.wasm \
    binding.cpp \
    -lemnapi-mt
