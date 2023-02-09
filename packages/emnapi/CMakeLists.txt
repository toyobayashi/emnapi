cmake_minimum_required(VERSION 3.13)

project(emnapi)

option(EMNAPI_INSTALL_SRC "EMNAPI_INSTALL_SRC" OFF)

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

set(UV_SRC
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/uv-common.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/threadpool.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/loop.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/thread.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/async.c"
  "${CMAKE_CURRENT_SOURCE_DIR}/src/uv/unix/core.c"
)

set(EMNAPI_SRC "${CMAKE_CURRENT_SOURCE_DIR}/src/emnapi.c")
set(EMNAPI_INCLUDE "${CMAKE_CURRENT_SOURCE_DIR}/include")

set(EMNAPI_JS_LIB "${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js")

if(IS_EMSCRIPTEN)
  set(EMNAPI_MT_CFLAGS "-sUSE_PTHREADS=1" "-sWASM_WORKERS=1")
else()
  set(EMNAPI_MT_CFLAGS "-pthread")
endif()

set(EMNAPI_TARGET_NAME "emnapi")
set(EMNAPI_MT_TARGET_NAME "emnapi-mt")
set(DLMALLOC_TARGET_NAME "dlmalloc")
set(EMMALLOC_TARGET_NAME "emmalloc")

if(IS_WASM32)
  add_library(${DLMALLOC_TARGET_NAME} STATIC
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/dlmalloc.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/sbrk.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/memcpy.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/memset.c"
  )
  target_compile_definitions(${DLMALLOC_TARGET_NAME} PRIVATE "PAGESIZE=65536")
  add_library(${EMMALLOC_TARGET_NAME} STATIC
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/emmalloc.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/sbrk.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/memcpy.c"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc/memset.c"
  )
  target_compile_definitions(${EMMALLOC_TARGET_NAME} PRIVATE "PAGESIZE=65536")
endif()

add_library(${EMNAPI_TARGET_NAME} STATIC ${EMNAPI_SRC} ${UV_SRC})
target_include_directories(${EMNAPI_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
if(IS_EMSCRIPTEN)
  target_link_options(${EMNAPI_TARGET_NAME} INTERFACE "--js-library=${EMNAPI_JS_LIB}")
endif()

if(IS_EMSCRIPTEN OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasi-threads"))
  set(EMNAPI_BUILD_MT ON)
else()
  set(EMNAPI_BUILD_MT OFF)
endif()

if(EMNAPI_BUILD_MT)
  add_library(${EMNAPI_MT_TARGET_NAME} STATIC ${EMNAPI_SRC} ${UV_SRC})
  target_compile_options(${EMNAPI_MT_TARGET_NAME} PRIVATE ${EMNAPI_MT_CFLAGS})
  target_include_directories(${EMNAPI_MT_TARGET_NAME} PUBLIC ${EMNAPI_INCLUDE})
  if(IS_EMSCRIPTEN)
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
  if(EMNAPI_BUILD_MT)
    install(TARGETS ${EMNAPI_MT_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  endif()
  if(IS_WASM32)
    install(TARGETS ${DLMALLOC_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
    install(TARGETS ${EMMALLOC_TARGET_NAME} DESTINATION "lib/${LIB_ARCH}")
  endif()
endif()

install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/include/common.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/emnapi.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/js_native_api_types.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/js_native_api.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/napi-inl.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/napi.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/node_api_types.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/node_api.h
    ${CMAKE_CURRENT_SOURCE_DIR}/include/uv.h
  DESTINATION "include/${PROJECT_NAME}")

install(DIRECTORY
  ${CMAKE_CURRENT_SOURCE_DIR}/include/uv
  DESTINATION "include/${PROJECT_NAME}")

install(FILES
    ${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js
  DESTINATION "lib/${PROJECT_NAME}")

if(EMNAPI_INSTALL_SRC)
  install(FILES
      ${EMNAPI_SRC}
    DESTINATION "src/${PROJECT_NAME}")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/uv
    DESTINATION "src/${PROJECT_NAME}")
  install(DIRECTORY
    ${CMAKE_CURRENT_SOURCE_DIR}/src/dlmalloc
    DESTINATION "src/${PROJECT_NAME}")
endif()
