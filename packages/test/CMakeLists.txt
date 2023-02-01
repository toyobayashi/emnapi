cmake_minimum_required(VERSION 3.13)

if(${CMAKE_VERSION} VERSION_GREATER_EQUAL "3.15.0")
  cmake_policy(SET CMP0091 NEW)
endif()
if(APPLE)
  cmake_policy(SET CMP0042 NEW)
  cmake_policy(SET CMP0068 NEW)
endif()

set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}" CACHE PATH "archive output")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}" CACHE PATH "library output")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}" CACHE PATH "exedll output")
set(CMAKE_PDB_OUTPUT_DIRECTORY     "${CMAKE_CURRENT_BINARY_DIR}/${CMAKE_BUILD_TYPE}" CACHE PATH "pdb output")
project(emnapitest)

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
  # Generate node.lib
  execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()

add_compile_definitions("NAPI_VERSION=8")

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  set(IS_EMSCRIPTEN ON)
else()
  set(IS_EMSCRIPTEN OFF)
endif()

if(CMAKE_SYSTEM_NAME STREQUAL "WASI")
  set(IS_WASI ON)
else()
  set(IS_WASI OFF)
endif()

if(IS_EMSCRIPTEN OR IS_WASI)
  set(IS_WASM ON)
else()
  set(IS_WASM OFF)
endif()

if(DEFINED ENV{UV_THREADPOOL_SIZE})
  set(EMNAPI_WORKER_POOL_SIZE $ENV{UV_THREADPOOL_SIZE})
else()
  set(EMNAPI_WORKER_POOL_SIZE "4")
endif()

math(EXPR PTHREAD_POOL_SIZE "${EMNAPI_WORKER_POOL_SIZE} * 4")

if(IS_WASM)
  include_directories("${CMAKE_CURRENT_SOURCE_DIR}/../emnapi/include")
else()
  include_directories(${CMAKE_JS_INC})
  include_directories("${CMAKE_CURRENT_SOURCE_DIR}/../../node_modules/node-addon-api")
endif()

if(NOT MSVC)
  add_compile_options("-Wall")
  add_link_options("-Wall")
endif()

if(DEFINED ENV{MEMORY64})
  set(IS_MEMORY64 $ENV{MEMORY64})
else()
  set(IS_MEMORY64 OFF)
endif()

if(IS_EMSCRIPTEN)
  if(IS_MEMORY64)
    add_compile_options("-sMEMORY64=1")
    add_link_options("-sMEMORY64=1")
  endif()

  set(COMMON_LINK_OPTIONS
    "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
    "-sNODEJS_CATCH_EXIT=0"
    "-sWASM_BIGINT=1"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sMIN_CHROME_VERSION=67"
    "-sSTACK_SIZE=2MB"
    "-sDEFAULT_PTHREAD_STACK_SIZE=2MB"
    "-sSAFE_HEAP=1"
    "--js-library=${CMAKE_CURRENT_SOURCE_DIR}/../emnapi/dist/library_napi.js"
    "-sMODULARIZE=1"
  )
elseif(IS_WASI)
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-mexec-model=reactor"
    # "-Wl,--import-memory"
    "-Wl,--initial-memory=16777216,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
else()
  set(COMMON_LINK_OPTIONS "")
endif()

add_library(testcommon STATIC "./common.c")
if(IS_WASM)
  add_library(emnapist STATIC "../emnapi/src/emnapi.c")
  if(IS_EMSCRIPTEN)
    add_library(emnapimt STATIC
      "../emnapi/src/emnapi.c"
      "../emnapi/src/uv/uv-common.c"
      "../emnapi/src/uv/threadpool.c"
      "../emnapi/src/uv/unix/loop.c"
      "../emnapi/src/uv/unix/thread.c"
      "../emnapi/src/uv/unix/async.c"
      "../emnapi/src/uv/unix/core.c"
    )

    target_compile_definitions(emnapimt PRIVATE
      "EMNAPI_WORKER_POOL_SIZE=${EMNAPI_WORKER_POOL_SIZE}")
    target_compile_options(emnapimt PUBLIC "-pthread")
  endif()
endif()

function(add_test NAME SOURCE_LIST NEED_ENTRY PTHREAD LINKOPTIONS)
  set(__SRC_LIST ${SOURCE_LIST})
  if(NEED_ENTRY)
    list(APPEND __SRC_LIST "./entry_point.c")
  endif()
  if(IS_WASM)
    add_executable(${NAME} ${__SRC_LIST})
    if(IS_WASI)
      set_target_properties(${NAME} PROPERTIES SUFFIX ".wasm")
      if(CMAKE_BUILD_TYPE STREQUAL "Release")
        # https://github.com/WebAssembly/wasi-sdk/issues/254
        target_link_options(${NAME} PRIVATE
          "-Wl,--strip-debug"
        )
      endif()
    endif()
  else()
    add_library(${NAME} SHARED ${__SRC_LIST} ${CMAKE_JS_SRC})
    set_target_properties(${NAME} PROPERTIES PREFIX "" SUFFIX ".node")
    target_link_libraries(${NAME} PRIVATE ${CMAKE_JS_LIB})
  endif()

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  target_link_libraries(${NAME} PRIVATE "testcommon")
  if(IS_WASM)
    if(PTHREAD)
      target_link_libraries(${NAME} PRIVATE "emnapimt")
      target_link_options(${NAME} PRIVATE "-pthread")
      if(IS_EMSCRIPTEN)
        target_link_options(${NAME} PRIVATE "-sPTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}" "-sPTHREAD_POOL_SIZE_STRICT=2")
      endif()
    else()
      target_link_libraries(${NAME} PRIVATE "emnapist")
    endif()
  endif()
  target_link_options(${NAME} PRIVATE ${COMMON_LINK_OPTIONS})
  if(IS_EMSCRIPTEN)
    target_link_options(${NAME} PRIVATE "-sEXPORT_NAME=emnapitest_${NAME}")
  endif()
  target_link_options(${NAME} PRIVATE ${LINKOPTIONS})
endfunction()

function(add_naa_test NAME SOURCE_LIST DEFINES ENABLE_EXCEPTION)
  if(IS_WASM)
    add_executable(${NAME} ${SOURCE_LIST})
    if(IS_WASI)
      set_target_properties(${NAME} PROPERTIES SUFFIX ".wasm")
      if(CMAKE_BUILD_TYPE STREQUAL "Release")
        # https://github.com/WebAssembly/wasi-sdk/issues/254
        target_link_options(${NAME} PRIVATE
          "-Wl,--strip-debug"
        )
      endif()
    endif()
  else()
    add_library(${NAME} SHARED ${SOURCE_LIST} ${CMAKE_JS_SRC})
    set_target_properties(${NAME} PROPERTIES PREFIX "" SUFFIX ".node")
    target_link_libraries(${NAME} PRIVATE ${CMAKE_JS_LIB})
  endif()

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  if(IS_WASM)
    target_link_libraries(${NAME} PRIVATE "emnapimt")
    target_link_options(${NAME} PRIVATE "-pthread")
    if(IS_EMSCRIPTEN)
      target_link_options(${NAME} PRIVATE "-sPTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}" "-sPTHREAD_POOL_SIZE_STRICT=2")
    endif()
  endif()
  target_include_directories(${NAME} PRIVATE "./node-addon-api/common")
  target_compile_definitions(${NAME} PRIVATE ${DEFINES})
  if(ENABLE_EXCEPTION)
    if(IS_EMSCRIPTEN)
      target_compile_options(${NAME} PRIVATE "-sDISABLE_EXCEPTION_CATCHING=0")
      target_link_options(${NAME} PRIVATE "-sDISABLE_EXCEPTION_CATCHING=0")
    endif()
  else()
    target_compile_definitions(${NAME} PRIVATE "NAPI_DISABLE_CPP_EXCEPTIONS")
  endif()

  target_link_options(${NAME} PRIVATE ${COMMON_LINK_OPTIONS})
  if(IS_EMSCRIPTEN)
    target_link_options(${NAME} PRIVATE "-sEXPORT_NAME=emnapitest_${NAME}")
  endif()
  target_link_options(${NAME} PRIVATE ${LINKOPTIONS})
endfunction()

add_test("env" "./env/binding.c" OFF OFF "")
add_test("hello" "./hello/binding.c" OFF OFF "")

if((NOT IS_WASM) OR (IS_EMSCRIPTEN AND NOT IS_MEMORY64))
  add_test("string_mt" "./string/binding.c" ON ON "")
  add_test("async" "./async/binding.c" OFF ON "")
  add_test("pool" "./pool/binding.c" OFF ON "--pre-js=../pool/pre.js")
  add_test("tsfn" "./tsfn/binding.c" OFF ON "")
  add_test("async_cleanup_hook" "./async_cleanup_hook/binding.c" OFF ON "")
endif()

add_test("arg" "./arg/binding.c" ON OFF "")
add_test("callback" "./callback/binding.c" ON OFF "")
add_test("objfac" "./objfac/binding.c" ON OFF "")
add_test("fnfac" "./fnfac/binding.c" ON OFF "")
add_test("general" "./general/binding.c" ON OFF "")
add_test("filename" "./filename/binding.c" ON OFF "")
add_test("string" "./string/binding.c" ON OFF "")
add_test("property" "./property/binding.c" ON OFF "")
add_test("promise" "./promise/binding.c" ON OFF "")
add_test("object" "./object/test_null.c;./object/test_object.c" ON OFF "")
add_test("objwrap" "./objwrap/myobject.cc" ON OFF "")
add_test("bigint" "./bigint/binding.c" ON OFF "")
add_test("fnwrap" "./fnwrap/myobject.cc;./fnwrap/binding.cc" ON OFF "")
add_test("passwrap" "./passwrap/myobject.cc;./passwrap/binding.cc" ON OFF "")
add_test("array" "./array/binding.c" ON OFF "")
add_test("constructor" "./constructor/binding.c" ON OFF "")
add_test("conversion" "./conversion/test_conversions.c;./conversion/test_null.c" ON OFF "")
add_test("dataview" "./dataview/binding.c" ON OFF "")
add_test("date" "./date/binding.c" ON OFF "")
add_test("error" "./error/binding.c" ON OFF "")
add_test("exception" "./exception/binding.c" ON OFF "")
add_test("ref" "./ref/binding.c" ON OFF "")
add_test("ref_double_free" "./ref_double_free/binding.c" ON OFF "")
add_test("function" "./function/binding.c" ON OFF "")
add_test("scope" "./scope/binding.c" ON OFF "")
add_test("newtarget" "./newtarget/binding.c" ON OFF "")
add_test("number" "./number/binding.c" ON OFF "")
add_test("symbol" "./symbol/binding.c" ON OFF "")
add_test("typedarray" "./typedarray/binding.c" ON OFF "")
add_test("buffer" "./buffer/binding.c" OFF OFF "")
add_test("fatal_exception" "./fatal_exception/binding.c" OFF OFF "")
add_test("cleanup_hook" "./cleanup_hook/binding.c" OFF OFF "")

if(IS_EMSCRIPTEN)
  add_test("emnapitest" "./emnapitest/binding.c" ON OFF "-sEXPORTED_RUNTIME_METHODS=['emnapiSyncMemory']")
endif()

add_test("version" "./version/binding.c" OFF OFF "")
add_test("make_callback" "./make_callback/binding.c" OFF OFF "")
add_test("async_context" "./async_context/binding.c" OFF OFF "")

if(IS_EMSCRIPTEN AND NOT IS_MEMORY64)
  file(GLOB_RECURSE naa_binding_SRC
    "./node-addon-api/*.cc")

  add_naa_test("naa_binding" "${naa_binding_SRC}" "" ON)
  add_naa_test("naa_binding_noexcept" "${naa_binding_SRC}" "" OFF)
  add_naa_test("naa_binding_noexcept_maybe" "${naa_binding_SRC}" "NODE_ADDON_API_ENABLE_MAYBE" OFF)
  add_naa_test("naa_binding_custom_namespace" "${naa_binding_SRC}" "NAPI_CPP_CUSTOM_NAMESPACE=cstm" OFF)
endif()
