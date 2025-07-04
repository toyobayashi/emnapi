cmake_minimum_required(VERSION 3.13)

project(emnapi LANGUAGES C CXX ASM)

option(EMNAPI_INSTALL_SRC "EMNAPI_INSTALL_SRC" OFF)
option(EMNAPI_FIND_NODE_ADDON_API "EMNAPI_FIND_NODE_ADDON_API" OFF)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  set(IS_EMSCRIPTEN ON)
else()
  set(IS_EMSCRIPTEN OFF)
endif()

if((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-unknown-unknown"))
  set(IS_WASM32 ON)
else()
  set(IS_WASM32 OFF)
endif()

if((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasi") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasip1"))
  set(IS_WASM32_WASIP1 ON)
else()
  set(IS_WASM32_WASIP1 OFF)
endif()

if((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasi-threads") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasip1-threads"))
  set(IS_WASM32_WASIP1_THREADS ON)
else()
  set(IS_WASM32_WASIP1_THREADS OFF)
endif()

set(V8_SRC
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/external.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/exception.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/function.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/handle_scope.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/internal.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/isolate.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/object.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/string.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/value.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/boolean.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/number.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/template.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/try_catch.cc"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/v8/script.cc"
)

set(UV_SRC
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/uv-common.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/threadpool.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/loop.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/posix-hrtime.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/thread.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/async.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/core.c"
)

set(ENAPI_BASIC_SRC
  "${CMAKE_CURRENT_SOURCE_DIR}/src/js_native_api.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/node_api.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/async_cleanup_hook.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/async_context.c"
)
set(EMNAPI_THREADS_SRC
  "${CMAKE_CURRENT_SOURCE_DIR}/src/async_work.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/threadsafe_function.c"
)
set(EMNAPI_SRC ${ENAPI_BASIC_SRC} ${EMNAPI_THREADS_SRC})

set(EMNAPI_INCLUDE "${CMAKE_CURRENT_SOURCE_DIR}/include/node")
set(EMNAPI_DEFINES "BUILDING_NODE_EXTENSION")
set(V8_DEFINES "V8_ENABLE_DIRECT_LOCAL")

set(EMNAPI_JS_LIB "${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js")
set(V8_JS_LIB "${CMAKE_CURRENT_SOURCE_DIR}/dist/library_v8.js")

if(IS_EMSCRIPTEN)
  set(EMNAPI_MT_CFLAGS "-pthread" "-sWASM_WORKERS=1")

  # https://github.com/emscripten-core/emscripten/issues/20035
  # https://github.com/emscripten-core/emscripten/pull/20130
  list(APPEND EMNAPI_DEFINES "NAPI_EXTERN=__attribute__((__import_module__(\"env\")))")
else()
  set(EMNAPI_MT_CFLAGS "-pthread")
endif()

set(EMNAPI_BASIC_TARGET_NAME "emnapi-basic")
set(EMNAPI_BASIC_MT_TARGET_NAME "emnapi-basic-mt")
set(EMNAPI_TARGET_NAME "emnapi")
set(EMNAPI_MT_TARGET_NAME "emnapi-mt")
set(DLMALLOC_TARGET_NAME "dlmalloc")
set(DLMALLOC_MT_TARGET_NAME "dlmalloc-mt")
set(EMMALLOC_TARGET_NAME "emmalloc")
set(EMMALLOC_MT_TARGET_NAME "emmalloc-mt")
set(V8_TARGET_NAME "v8")
set(V8_MT_TARGET_NAME "v8-mt")

if(EMNAPI_FIND_NODE_ADDON_API)
  execute_process(
    COMMAND "node" "-p" "require('node-addon-api').include"
    WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
    OUTPUT_VARIABLE OUTPUT_NAA_INCLUDE_DIR
    ERROR_VARIABLE ERROR_NAA_INCLUDE_DIR
  )
  if(NOT (ERROR_NAA_INCLUDE_DIR STREQUAL ""))
    message(WARNING "Cannot find module 'node-addon-api'")
  else()
    string(REGEX REPLACE "(\r?\n)|\"" "" OUTPUT_NAA_INCLUDE_DIR "${OUTPUT_NAA_INCLUDE_DIR}")
    string(REPLACE "\\" "/" OUTPUT_NAA_INCLUDE_DIR "${OUTPUT_NAA_INCLUDE_DIR}")
    list(APPEND EMNAPI_INCLUDE "${OUTPUT_NAA_INCLUDE_DIR}")
  endif()
endif()

if(IS_WASM32)
  set(MALLOC_PUBLIC_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/sbrk.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/memcpy.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/memset.c"
  )
  add_library(${DLMALLOC_TARGET_NAME} STATIC
    ${MALLOC_PUBLIC_SOURCES}
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/dlmalloc/dlmalloc.c"
  )
  target_compile_definitions(${DLMALLOC_TARGET_NAME} PRIVATE "PAGESIZE=65536")

  add_library(${DLMALLOC_MT_TARGET_NAME} STATIC
    ${MALLOC_PUBLIC_SOURCES}
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/dlmalloc/dlmalloc.c"
  )
  target_compile_options(${DLMALLOC_MT_TARGET_NAME} PUBLIC "-matomics" "-mbulk-memory")
  target_compile_definitions(${DLMALLOC_MT_TARGET_NAME} PRIVATE "PAGESIZE=65536" "USE_LOCKS=1")

  add_library(${EMMALLOC_TARGET_NAME} STATIC
    ${MALLOC_PUBLIC_SOURCES}
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/emmalloc/emmalloc.c"
  )
  target_compile_options(${EMMALLOC_TARGET_NAME} PRIVATE "-fno-strict-aliasing")
  target_compile_definitions(${EMMALLOC_TARGET_NAME} PRIVATE "PAGESIZE=65536")

  add_library(${EMMALLOC_MT_TARGET_NAME} STATIC
    ${MALLOC_PUBLIC_SOURCES}
    "${CMAKE_CURRENT_SOURCE_DIR}/src/malloc/emmalloc/emmalloc.c"
  )
  target_compile_options(${EMMALLOC_MT_TARGET_NAME} PRIVATE "-fno-strict-aliasing")
  target_compile_options(${EMMALLOC_MT_TARGET_NAME} PUBLIC "-matomics" "-mbulk-memory")
  target_compile_definitions(${EMMALLOC_MT_TARGET_NAME} PRIVATE "PAGESIZE=65536" "__EMSCRIPTEN_SHARED_MEMORY__=1")
endif()

if(NOT IS_WASM32)
  set(EMNAPI_BUILD_V8 ON)
else()
  set(EMNAPI_BUILD_V8 OFF)
endif()

if(EMNAPI_BUILD_V8)
  add_library(${V8_TARGET_NAME} STATIC ${V8_SRC})
  target_include_directories(${V8_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
  target_compile_definitions(${V8_TARGET_NAME} PUBLIC ${EMNAPI_DEFINES} ${V8_DEFINES})
  if(IS_EMSCRIPTEN)
    set_target_properties(${V8_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
    target_link_options(${V8_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}" "--js-library=${V8_JS_LIB}")
  endif()
endif()

if(NAPI_VERSION)
  add_compile_definitions("NAPI_VERSION=${NAPI_VERSION}")
endif()

add_library(${EMNAPI_TARGET_NAME} STATIC ${EMNAPI_SRC} ${UV_SRC})
target_include_directories(${EMNAPI_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
target_compile_definitions(${EMNAPI_TARGET_NAME} PUBLIC ${EMNAPI_DEFINES})
if(IS_EMSCRIPTEN)
  set_target_properties(${EMNAPI_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
  target_link_options(${EMNAPI_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}")
endif()

add_library(${EMNAPI_BASIC_TARGET_NAME} STATIC ${ENAPI_BASIC_SRC})
target_include_directories(${EMNAPI_BASIC_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
target_compile_definitions(${EMNAPI_BASIC_TARGET_NAME}
  PUBLIC ${EMNAPI_DEFINES}
  PRIVATE "EMNAPI_DISABLE_UV"
)
if(IS_EMSCRIPTEN)
  set_target_properties(${EMNAPI_BASIC_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
  target_link_options(${EMNAPI_BASIC_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}")
endif()

if(IS_WASM32 OR IS_WASM32_WASIP1 OR IS_WASM32_WASIP1_THREADS)
  set(EMNAPI_BUILD_BASIC_MT ON)
else()
  set(EMNAPI_BUILD_BASIC_MT OFF)
endif()

if(EMNAPI_BUILD_BASIC_MT)
  add_library(${EMNAPI_BASIC_MT_TARGET_NAME} STATIC
    ${ENAPI_BASIC_SRC}
    "${CMAKE_CURRENT_SOURCE_DIR}/src/thread/async_worker_create.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/thread/async_worker_init.S"
  )
  target_compile_options(${EMNAPI_BASIC_MT_TARGET_NAME} PUBLIC "-matomics" "-mbulk-memory")
  target_include_directories(${EMNAPI_BASIC_MT_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
  target_compile_definitions(${EMNAPI_BASIC_MT_TARGET_NAME}
    PUBLIC ${EMNAPI_DEFINES}
    PRIVATE "EMNAPI_DISABLE_UV"
  )

  if(IS_EMSCRIPTEN)
    set_target_properties(${EMNAPI_BASIC_MT_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
    target_link_options(${EMNAPI_BASIC_MT_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}")
  endif()
endif()

if(IS_EMSCRIPTEN OR IS_WASM32_WASIP1_THREADS)
  set(EMNAPI_BUILD_MT ON)
else()
  set(EMNAPI_BUILD_MT OFF)
endif()

if(EMNAPI_BUILD_MT)
  add_library(${EMNAPI_MT_TARGET_NAME} STATIC ${EMNAPI_SRC} ${UV_SRC})
  target_compile_options(${EMNAPI_MT_TARGET_NAME}
    PUBLIC "-matomics" "-mbulk-memory"
    PRIVATE ${EMNAPI_MT_CFLAGS}
  )
  target_include_directories(${EMNAPI_MT_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
  target_compile_definitions(${EMNAPI_MT_TARGET_NAME} PUBLIC ${EMNAPI_DEFINES})
  if(IS_EMSCRIPTEN)
    set_target_properties(${EMNAPI_MT_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
    target_link_options(${EMNAPI_MT_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}")
  endif()
  if(EMNAPI_WORKER_POOL_SIZE)
    target_compile_definitions(${EMNAPI_MT_TARGET_NAME} PRIVATE "EMNAPI_WORKER_POOL_SIZE=${EMNAPI_WORKER_POOL_SIZE}")
  endif()
  if(EMNAPI_NEXTTICK_TYPE)
    target_compile_definitions(${EMNAPI_MT_TARGET_NAME} PRIVATE "EMNAPI_NEXTTICK_TYPE=${EMNAPI_NEXTTICK_TYPE}")
  endif()
  if(EMNAPI_USE_PROXYING)
    target_compile_definitions(${EMNAPI_MT_TARGET_NAME} PRIVATE "EMNAPI_USE_PROXYING=${EMNAPI_USE_PROXYING}")
  endif()

  if(EMNAPI_BUILD_V8)
    add_library(${V8_MT_TARGET_NAME} STATIC ${V8_SRC})
    target_compile_options(${V8_MT_TARGET_NAME}
      PUBLIC "-matomics" "-mbulk-memory"
      PRIVATE ${EMNAPI_MT_CFLAGS}
    )
    target_include_directories(${V8_MT_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
    target_compile_definitions(${V8_MT_TARGET_NAME} PUBLIC ${EMNAPI_DEFINES} ${V8_DEFINES})
    if(IS_EMSCRIPTEN)
      set_target_properties(${V8_MT_TARGET_NAME} PROPERTIES INTERFACE_LINK_DEPENDS ${EMNAPI_JS_LIB})
      target_link_options(${V8_MT_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}" "--js-library=${V8_JS_LIB}")
    endif()
  endif()
endif()

if(IS_EMSCRIPTEN)
  set(LIB_ARCH "${CMAKE_LIBRARY_ARCHITECTURE}")
else()
  set(LIB_ARCH "${CMAKE_C_COMPILER_TARGET}")
endif()

# install(TARGETS ${EMNAPI_TARGET_NAME} DESTINATION "lib/${PROJECT_NAME}")
# if(EMNAPI_BUILD_MT)
#   install(TARGETS ${EMNAPI_MT_TARGET_NAME} DESTINATION "lib/${PROJECT_NAME}")
# endif()
if(LIB_ARCH)
  install(TARGETS ${EMNAPI_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  install(TARGETS ${EMNAPI_BASIC_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  if(EMNAPI_BUILD_V8)
    install(TARGETS ${V8_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  endif()
  if(EMNAPI_BUILD_MT)
    install(TARGETS ${EMNAPI_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    if(EMNAPI_BUILD_V8)
      install(TARGETS ${V8_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    endif()
  endif()
  if(EMNAPI_BUILD_BASIC_MT)
    install(TARGETS ${EMNAPI_BASIC_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  endif()
  if(IS_WASM32)
    install(TARGETS ${DLMALLOC_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    install(TARGETS ${DLMALLOC_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    install(TARGETS ${EMMALLOC_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    install(TARGETS ${EMMALLOC_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  endif()
endif()

install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/common.gypi
    ${CMAKE_CURRENT_SOURCE_DIR}/emnapi.gyp
  DESTINATION ".")

install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/include/node
  DESTINATION "include")

install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js
    ${CMAKE_CURRENT_SOURCE_DIR}/dist/library_v8.js
  DESTINATION "dist")

if(EMNAPI_INSTALL_SRC)
  install(FILES
      ${EMNAPI_SRC}
      "${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi_internal.h"
    DESTINATION "src")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/uv
    DESTINATION "src")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/malloc
    DESTINATION "src")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/thread
    DESTINATION "src")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/v8
    DESTINATION "src")
endif()
