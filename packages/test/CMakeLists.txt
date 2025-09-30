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
  set(UV_THREADPOOL_SIZE $ENV{UV_THREADPOOL_SIZE})
else()
  set(UV_THREADPOOL_SIZE "4")
endif()

math(EXPR PTHREAD_POOL_SIZE "${UV_THREADPOOL_SIZE} * 4")

if(IS_WASM)
  include_directories("${CMAKE_CURRENT_SOURCE_DIR}/../emnapi/include/node")
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
    "-sNODEJS_CATCH_EXIT=0"
    "-sWASM_BIGINT=1"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sMIN_CHROME_VERSION=85"
    "-sSTACK_SIZE=1048576"
    "-sDEFAULT_PTHREAD_STACK_SIZE=1048576"
    "-sINITIAL_MEMORY=16777216"
    "-sMAXIMUM_MEMORY=2147483648"
    "-sSAFE_HEAP=1"
    "-sMODULARIZE=1"
    "-sEXPORTED_RUNTIME_METHODS=['emnapiInit','ExitStatus']"
  )
  set(COMMON_EXPORTS_NAPI
    "-sEXPORTED_FUNCTIONS=['_malloc','_free','_napi_register_wasm_v1','_node_api_module_get_api_version_v1']"
  )
  set(COMMON_EXPORTS_V8
    "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  )
elseif(IS_WASI_THREADS)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-mexec-model=reactor"
    "-Wl,-zstack-size=1048576,--initial-memory=16777216,--max-memory=2147483648,--import-memory,--export-dynamic,--export=malloc,--export=free,--export=emnapi_thread_crashed,--import-undefined,--export-table"
  )
  set(COMMON_EXPORTS_NAPI
    "-Wl,--export=napi_register_wasm_v1,--export-if-defined=node_api_module_get_api_version_v1"
  )
  set(COMMON_EXPORTS_V8
    ""
  )
elseif(IS_WASI)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-mexec-model=reactor"
    "-Wl,-zstack-size=1048576,--initial-memory=16777216,--max-memory=2147483648,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
  set(COMMON_EXPORTS_NAPI
    "-Wl,--export=napi_register_wasm_v1,--export-if-defined=node_api_module_get_api_version_v1"
  )
  set(COMMON_EXPORTS_V8
    ""
  )
elseif(IS_WASM32)
  add_compile_options("-fno-exceptions")
  set(COMMON_LINK_OPTIONS
    # "-v"
    "-nostdlib"
    "-Wl,-zstack-size=1048576,--initial-memory=16777216,--max-memory=2147483648,--no-entry,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
  )
  set(COMMON_EXPORTS_NAPI
    "-Wl,--export=napi_register_wasm_v1,--export-if-defined=node_api_module_get_api_version_v1"
  )
  set(COMMON_EXPORTS_V8
    ""
  )
else()
  set(COMMON_LINK_OPTIONS "")
endif()

if(IS_WASM)
set(EMNAPI_FIND_NODE_ADDON_API ON)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../emnapi" "${CMAKE_CURRENT_BINARY_DIR}/emnapi")
endif()

set(WASM32_MALLOC "emmalloc")

function(add_test NAME SOURCE_LIST PTHREAD)
  set(__SRC_LIST ${SOURCE_LIST})

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
    target_compile_definitions(${NAME} PRIVATE "EMNAPI_UNMODIFIED_NATIVE_TEST")
  endif()

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  if(IS_WASM)
    if(PTHREAD)
      if((IS_WASI AND NOT IS_WASI_THREADS) OR IS_WASM32)
        if(IS_WASM32)
          target_link_libraries(${NAME} PRIVATE "emnapi-basic-mt")
          target_link_options(${NAME} PRIVATE "-Wl,--import-memory,--shared-memory,--export=emnapi_async_worker_create,--export=emnapi_async_worker_init")
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
    endif()
  endif()
  target_link_options(${NAME} PRIVATE
    ${COMMON_LINK_OPTIONS}
    ${COMMON_EXPORTS_NAPI}
  )
  if(IS_EMSCRIPTEN)
    target_link_options(${NAME} PRIVATE "-sEXPORT_NAME=emnapitest_${NAME}")
  endif()
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

  target_compile_definitions(${NAME} PRIVATE "NAPI_VERSION=9")

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  if(IS_WASM)
    if((IS_WASI AND NOT IS_WASI_THREADS) OR IS_WASM32)
      if(IS_WASM32)
        target_link_libraries(${NAME} PRIVATE "emnapi-basic-mt")
        target_link_options(${NAME} PRIVATE "-Wl,--import-memory,--shared-memory,--export=emnapi_async_worker_create,--export=emnapi_async_worker_init")
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

  target_link_options(${NAME} PRIVATE
    ${COMMON_LINK_OPTIONS}
    ${COMMON_EXPORTS_NAPI}
  )
  if(IS_EMSCRIPTEN)
    target_link_options(${NAME} PRIVATE "-sEXPORT_NAME=emnapitest_${NAME}")
  endif()
endfunction()

add_test("env" "./env/binding.c" OFF)
add_test("hello" "./hello/binding.c" OFF)

add_test("async" "./async/binding.c" ON)
add_test("async_st" "./async/binding.c" OFF)
add_test("tsfn2" "./tsfn2/binding.c" ON)
add_test("tsfn2_st" "./tsfn2/binding.c" OFF)

if((NOT IS_WASM) OR IS_EMSCRIPTEN OR IS_WASI_THREADS)
  add_test("string_mt" "./string/binding.c;./string/test_null.c" ON)
  target_compile_definitions("string_mt" PRIVATE "NAPI_VERSION=10")
  add_test("pool" "./pool/binding.c" ON)
  add_test("tsfn" "./tsfn/binding.c" ON)
  add_test("async_cleanup_hook" "./async_cleanup_hook/binding.c" ON)
  add_test("uv_threadpool_size" "./uv_threadpool_size/binding.c" ON)
  add_test("trap_in_thread" "./trap_in_thread/binding.c" ON)
endif()

add_test("arg" "./arg/binding.c" OFF)
add_test("cbinfo" "./cbinfo/binding.c" OFF)
add_test("callback" "./callback/binding.c" OFF)
add_test("objfac" "./objfac/binding.c" OFF)
add_test("fnfac" "./fnfac/binding.c" OFF)
add_test("general" "./general/binding.c" OFF)
add_test("filename" "./filename/binding.c" OFF)
add_test("string" "./string/binding.c;./string/test_null.c" OFF)
target_compile_definitions("string" PRIVATE "NAPI_VERSION=10")
add_test("property" "./property/binding.c" OFF)
add_test("promise" "./promise/binding.c" OFF)
add_test("object" "./object/test_null.c;./object/test_object.c" OFF)
add_test("object_exception" "./object/test_exceptions.c" OFF)
add_test("objwrap" "./objwrap/myobject.cc" OFF)
add_test("objwrapbasicfinalizer" "./objwrap/myobject.cc" OFF)
target_compile_definitions("objwrapbasicfinalizer" PRIVATE "NAPI_EXPERIMENTAL")
add_test("objnestedwrap" "./objwrap/nested_wrap.cc" OFF)
target_compile_definitions("objnestedwrap" PRIVATE "NAPI_EXPERIMENTAL=10")
add_test("bigint" "./bigint/binding.c" OFF)
add_test("fnwrap" "./fnwrap/myobject.cc;./fnwrap/binding.cc" OFF)
add_test("passwrap" "./passwrap/myobject.cc;./passwrap/binding.cc" OFF)
add_test("array" "./array/binding.c" OFF)
add_test("constructor" "./constructor/binding.c;./constructor/test_null.c" OFF)
add_test("conversion" "./conversion/test_conversions.c;./conversion/test_null.c" OFF)
add_test("dataview" "./dataview/binding.c" OFF)
add_test("date" "./date/binding.c" OFF)
add_test("error" "./error/binding.c" OFF)
add_test("exception" "./exception/binding.c" OFF)
add_test("ref_finalizer" "./ref_finalizer/binding.c" OFF)
add_test("ref" "./ref/binding.c" OFF)
add_test("ref_double_free" "./ref_double_free/binding.c" OFF)
add_test("function" "./function/binding.c" OFF)
add_test("scope" "./scope/binding.c" OFF)
add_test("newtarget" "./newtarget/binding.c" OFF)
add_test("number" "./number/binding.c;./number/test_null.c" OFF)
add_test("symbol" "./symbol/binding.c" OFF)
add_test("typedarray" "./typedarray/binding.c" OFF)
add_test("sharedarraybuffer" "./sharedarraybuffer/binding.c" OFF)
add_test("buffer" "./buffer/binding.c" OFF)
target_compile_definitions("buffer" PRIVATE "NAPI_VERSION=10")
add_test("buffer_finalizer" "./buffer_finalizer/binding.c" OFF)
add_test("fatal_exception" "./fatal_exception/binding.c" OFF)
add_test("cleanup_hook" "./cleanup_hook/binding.c" OFF)

add_test("finalizer" "./finalizer/binding.c" OFF)
target_compile_definitions("finalizer" PRIVATE "NAPI_EXPERIMENTAL")

add_test("reference_obj_only" "./ref_by_node_api_version/binding.c" OFF)
target_compile_definitions("reference_obj_only" PRIVATE "NAPI_VERSION=9")
add_test("reference_all_types" "./ref_by_node_api_version/binding.c" OFF)
target_compile_definitions("reference_all_types" PRIVATE "NAPI_VERSION=10")

add_test("runjs_pe" "./runjs/binding.c" OFF)
target_compile_definitions("runjs_pe" PRIVATE "NAPI_VERSION=9")
add_test("runjs_cnrj" "./runjs/binding.c" OFF)
target_compile_definitions("runjs_cnrj" PRIVATE "NAPI_VERSION=10")

if(IS_WASM)
  if(IS_EMSCRIPTEN)
    add_test("emnapitest" "./emnapitest/binding.c" OFF)
    target_link_options("emnapitest" PRIVATE "-sEXPORTED_RUNTIME_METHODS=['emnapiInit','ExitStatus','emnapiSyncMemory']")
  else()
    add_test("emnapitest" "./emnapitest/binding.c" OFF)
  endif()
endif()

add_test("version" "./version/binding.c" OFF)
add_test("make_callback" "./make_callback/binding.c" OFF)
add_test("async_context" "./async_context/binding.c" OFF)

if(IS_EMSCRIPTEN OR IS_WASI_THREADS OR NOT IS_WASM)
  file(GLOB_RECURSE naa_binding_SRC
    "./node-addon-api/*.cc")

  if(NOT IS_MEMORY64 AND NOT IS_WASI_THREADS)
  add_naa_test("naa_binding" "${naa_binding_SRC}" "" ON)
  endif()
  add_naa_test("naa_binding_noexcept" "${naa_binding_SRC}" "" OFF)
  add_naa_test("naa_binding_noexcept_maybe" "${naa_binding_SRC}" "NODE_ADDON_API_ENABLE_MAYBE" OFF)
  add_naa_test("naa_binding_custom_namespace" "${naa_binding_SRC}" "NAPI_CPP_CUSTOM_NAMESPACE=cstm" OFF)
endif()

function(add_test_v8 NAME SOURCE_LIST PTHREAD)
  set(__SRC_LIST ${SOURCE_LIST})

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
    target_compile_definitions(${NAME} PRIVATE "EMNAPI_UNMODIFIED_NATIVE_TEST")
  endif()

  set_target_properties(${NAME} PROPERTIES
    BUILD_RPATH "$ORIGIN")
  set_target_properties(${NAME} PROPERTIES
    CXX_STANDARD "17")
  if(IS_WASM)
    if(PTHREAD)
      if((IS_WASI AND NOT IS_WASI_THREADS) OR IS_WASM32)
        if(IS_WASM32)
          target_link_libraries(${NAME} PRIVATE "v8-mt")
          target_link_options(${NAME} PRIVATE "-Wl,--import-memory,--shared-memory,--export=emnapi_async_worker_create,--export=emnapi_async_worker_init")
        else()
          target_link_libraries(${NAME} PRIVATE "v8")
        endif()
      else()
        target_link_libraries(${NAME} PRIVATE "v8-mt")
        if(NOT IS_EMSCRIPTEN)
          target_link_libraries(${NAME} PRIVATE "emnapi-basic-mt")
        endif()
        target_compile_options(${NAME} PRIVATE "-pthread")
        target_link_options(${NAME} PRIVATE "-pthread")
      endif()
      if(IS_EMSCRIPTEN)
        target_link_options(${NAME} PRIVATE "-sPTHREAD_POOL_SIZE=${PTHREAD_POOL_SIZE}" "-sPTHREAD_POOL_SIZE_STRICT=2")
      endif()
    else()
      target_link_libraries(${NAME} PRIVATE "v8")
      if(NOT IS_EMSCRIPTEN)
        target_link_libraries(${NAME} PRIVATE "emnapi-basic")
      endif()
    endif()
  endif()
  target_include_directories(${NAME} PRIVATE "../../node_modules/nan")
  target_link_options(${NAME} PRIVATE
    ${COMMON_LINK_OPTIONS}
    ${COMMON_EXPORTS_V8}
  )
  if(IS_EMSCRIPTEN)
    target_link_options(${NAME} PRIVATE "-sEXPORT_NAME=emnapitest_${NAME}")
  endif()
endfunction()

if(NOT IS_WASM32)
  add_test_v8("v8_hello_world" "./v8_hello_world/binding.cc" OFF)
  if(IS_EMSCRIPTEN OR IS_WASI_THREADS OR NOT IS_WASM)
    # TODO nan test
    add_test_v8("nan_converters" "./nan/converters.cpp" ON)
    add_test_v8("nan_error" "./nan/error.cpp" ON)
    add_test_v8("nan_isolatedata" "./nan/isolatedata.cpp" ON)
    add_test_v8("nan_json_parse" "./nan/json-parse.cpp" ON)
    add_test_v8("nan_json_stringify" "./nan/json-stringify.cpp" ON)
    add_test_v8("nan_maybe" "./nan/maybe.cpp" ON)
    add_test_v8("nan_methodswithdata" "./nan/methodswithdata.cpp" ON)
    add_test_v8("nan_persistent" "./nan/persistent.cpp" ON)
    add_test_v8("nan_returnemptystring" "./nan/returnemptystring.cpp" ON)
    add_test_v8("nan_returnnull" "./nan/returnnull.cpp" ON)
    add_test_v8("nan_returnundefined" "./nan/returnundefined.cpp" ON)
    add_test_v8("nan_returnvalue" "./nan/returnvalue.cpp" ON)
    add_test_v8("nan_strings" "./nan/strings.cpp" ON)
    add_test_v8("nan_symbols" "./nan/symbols.cpp" ON)
    add_test_v8("nan_trycatch" "./nan/trycatch.cpp" ON)
  endif()
endif()
