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

# add_compile_definitions("NAPI_VERSION=8")

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

if((CMAKE_SYSTEM_NAME STREQUAL "WASI") AND (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-wasi-threads"))
  set(IS_WASI_THREADS ON)
else()
  set(IS_WASI_THREADS OFF)
endif()

if((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-unknown-unknown"))
  set(IS_WASM32 ON)
else()
  set(IS_WASM32 OFF)
endif()

if(IS_EMSCRIPTEN OR IS_WASI OR IS_WASM32)
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
    "-sMIN_CHROME_VERSION=84"
    "-sSTACK_SIZE=2MB"
    "-sDEFAULT_PTHREAD_STACK_SIZE=2MB"
    "-sSAFE_HEAP=1"
    "-sMODULARIZE=1"
  )
elseif(IS_WASI_THREADS)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-mexec-model=reactor"
    "-Wl,--import-memory,--max-memory=2147483648,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
elseif(IS_WASI)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-mexec-model=reactor"
    "-Wl,--initial-memory=16777216,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
elseif(IS_WASM32)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-nostdlib"
    "-Wl,--no-entry,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
else()
  set(COMMON_LINK_OPTIONS "")
endif()

if(IS_WASM)
set(EMNAPI_FIND_NODE_ADDON_API ON)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../emnapi" "${CMAKE_CURRENT_BINARY_DIR}/emnapi")
endif()

add_library(testcommon STATIC "./common.c")

set(WASM32_MALLOC "emmalloc")

function(add_test NAME SOURCE_LIST NEED_ENTRY PTHREAD LINKOPTIONS)
  set(__SRC_LIST ${SOURCE_LIST})
  if(NEED_ENTRY)
    list(APPEND __SRC_LIST "./entry_point.c")
  endif()
  if(IS_WASM)
    add_executable(${NAME} ${__SRC_LIST})
    if(IS_WASI OR IS_WASM32)
      set_target_properties(${NAME} PROPERTIES SUFFIX ".wasm")
      if(CMAKE_BUILD_TYPE STREQUAL "Release")
        # https://github.com/WebAssembly/wasi-sdk/issues/254
        target_link_options(${NAME} PRIVATE
          "-Wl,--strip-debug"
        )
      endif()
    endif()
    if(IS_WASM32)
      if(PTHREAD)
        target_link_libraries(${NAME} PRIVATE "${WASM32_MALLOC}-mt")
      else()
        target_link_libraries(${NAME} PRIVATE ${WASM32_MALLOC})
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
      if((IS_WASI AND NOT IS_WASI_THREADS) OR IS_WASM32)
        if(IS_WASM32)
          target_link_libraries(${NAME} PRIVATE "emnapi-basic-mt")
          target_link_options(${NAME} PRIVATE "-Wl,--import-memory,--shared-memory,--max-memory=2147483648,--export=emnapi_async_worker_create,--export=emnapi_async_worker_init")
        else()
          target_link_libraries(${NAME} PRIVATE "emnapi-basic")
        endif()
      else()
        target_link_libraries(${NAME} PRIVATE "emnapi-mt")
        target_compile_options(${NAME} PRIVATE "-pthread")
        target_link_options(${NAME} PRIVATE "-pthread")
      endif()
      if(IS_EMSCRIPTEN)
        target_link_options(${NAME} PRIVATE "-sPTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}" "-sPTHREAD_POOL_SIZE_STRICT=2")
      endif()
    else()
      target_link_libraries(${NAME} PRIVATE "emnapi-basic")
      if(IS_WASM32)
        target_link_options(${NAME} PRIVATE "-Wl,--initial-memory=16777216")
      endif()
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
    if(IS_WASI OR IS_WASM32)
      set_target_properties(${NAME} PROPERTIES SUFFIX ".wasm")
      if(CMAKE_BUILD_TYPE STREQUAL "Release")
        # https://github.com/WebAssembly/wasi-sdk/issues/254
        target_link_options(${NAME} PRIVATE
          "-Wl,--strip-debug"
        )
      endif()
    endif()
    if(IS_WASM32)
      target_link_libraries(${NAME} PRIVATE "${WASM32_MALLOC}-mt")
    endif()
  else()
    add_library(${NAME} SHARED ${SOURCE_LIST} ${CMAKE_JS_SRC})
    set_target_properties(${NAME} PROPERTIES PREFIX "" SUFFIX ".node")
    target_link_libraries(${NAME} PRIVATE ${CMAKE_JS_LIB})
  endif()

  target_compile_definitions(${NAME} PRIVATE "NAPI_VERSION=8")

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  if(IS_WASM)
    if((IS_WASI AND NOT IS_WASI_THREADS) OR IS_WASM32)
      if(IS_WASM32)
        target_link_libraries(${NAME} PRIVATE "emnapi-basic-mt")
        target_link_options(${NAME} PRIVATE "-Wl,--import-memory,--shared-memory,--max-memory=2147483648,--export=emnapi_async_worker_create,--export=emnapi_async_worker_init")
      else()
        target_link_libraries(${NAME} PRIVATE "emnapi-basic")
      endif()
    else()
      target_link_libraries(${NAME} PRIVATE "emnapi-mt")
      target_compile_options(${NAME} PRIVATE "-pthread")
      target_link_options(${NAME} PRIVATE "-pthread")
    endif()
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

add_test("async" "./async/binding.c" OFF ON "")
add_test("tsfn2" "./tsfn2/binding.c" OFF ON "")

if((NOT IS_WASM) OR IS_EMSCRIPTEN OR IS_WASI_THREADS)
  add_test("string_mt" "./string/binding.c;./string/test_null.c" ON ON "")
  if(IS_EMSCRIPTEN)
  add_test("pool" "./pool/binding.c" OFF ON "--pre-js=${CMAKE_CURRENT_SOURCE_DIR}/pool/pre.js")
  else()
  add_test("pool" "./pool/binding.c" OFF ON "")
  endif()
  add_test("tsfn" "./tsfn/binding.c" OFF ON "")
  add_test("async_cleanup_hook" "./async_cleanup_hook/binding.c" OFF ON "")
endif()

add_test("arg" "./arg/binding.c" ON OFF "")
add_test("callback" "./callback/binding.c" ON OFF "")
add_test("objfac" "./objfac/binding.c" ON OFF "")
add_test("fnfac" "./fnfac/binding.c" ON OFF "")
add_test("general" "./general/binding.c" ON OFF "")
add_test("filename" "./filename/binding.c" ON OFF "")
add_test("string" "./string/binding.c;./string/test_null.c" ON OFF "")
add_test("property" "./property/binding.c" ON OFF "")
add_test("promise" "./promise/binding.c" ON OFF "")
add_test("object" "./object/test_null.c;./object/test_object.c" ON OFF "")
add_test("objwrap" "./objwrap/myobject.cc" ON OFF "")
add_test("bigint" "./bigint/binding.c" ON OFF "")
add_test("fnwrap" "./fnwrap/myobject.cc;./fnwrap/binding.cc" ON OFF "")
add_test("passwrap" "./passwrap/myobject.cc;./passwrap/binding.cc" ON OFF "")
add_test("array" "./array/binding.c" ON OFF "")
add_test("constructor" "./constructor/binding.c;./constructor/test_null.c" ON OFF "")
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
add_test("number" "./number/binding.c;./number/test_null.c" ON OFF "")
add_test("symbol" "./symbol/binding.c" ON OFF "")
add_test("typedarray" "./typedarray/binding.c" ON OFF "")
add_test("buffer" "./buffer/binding.c" OFF OFF "")
add_test("fatal_exception" "./fatal_exception/binding.c" OFF OFF "")
add_test("cleanup_hook" "./cleanup_hook/binding.c" OFF OFF "")

add_test("reference_obj_only" "./ref_by_node_api_version/binding.c" OFF OFF "")
target_compile_definitions("reference_obj_only" PRIVATE "NAPI_VERSION=8")
add_test("reference_all_types" "./ref_by_node_api_version/binding.c" OFF OFF "")
target_compile_definitions("reference_all_types" PRIVATE "NAPI_EXPERIMENTAL")

if(IS_WASM)
  if(IS_EMSCRIPTEN)
    add_test("emnapitest" "./emnapitest/binding.c" ON OFF "-sEXPORTED_RUNTIME_METHODS=['emnapiSyncMemory']")
  else()
    add_test("emnapitest" "./emnapitest/binding.c" ON OFF "")
  endif()
endif()

add_test("version" "./version/binding.c" OFF OFF "")
add_test("make_callback" "./make_callback/binding.c" OFF OFF "")
add_test("async_context" "./async_context/binding.c" OFF OFF "")

if(IS_EMSCRIPTEN OR IS_WASI_THREADS)
  file(GLOB_RECURSE naa_binding_SRC
    "./node-addon-api/*.cc")

  if(NOT IS_MEMORY64 AND NOT IS_WASI_THREADS)
  add_naa_test("naa_binding" "${naa_binding_SRC}" "" ON)
  endif()
  add_naa_test("naa_binding_noexcept" "${naa_binding_SRC}" "" OFF)
  add_naa_test("naa_binding_noexcept_maybe" "${naa_binding_SRC}" "NODE_ADDON_API_ENABLE_MAYBE" OFF)
  add_naa_test("naa_binding_custom_namespace" "${naa_binding_SRC}" "NAPI_CPP_CUSTOM_NAMESPACE=cstm" OFF)
endif()
