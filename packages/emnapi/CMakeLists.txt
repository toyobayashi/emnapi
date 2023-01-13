cmake_minimum_required(VERSION 3.13)

project(emnapi)

option(EMNAPI_INSTALL_SRC "EMNAPI_INSTALL_SRC" OFF)

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
# set(EMNAPI_JS_LIB_NO_RUNTIME "${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi_no_runtime.js")

set(EMNAPI_MT_CFLAGS "-sUSE_PTHREADS=1" "-sWASM_WORKERS=1")

# add_library(uv STATIC ${UV_SRC})
# target_include_directories(uv PUBLIC ${EMNAPI_INCLUDE})
# target_compile_options(uv PRIVATE ${EMNAPI_MT_CFLAGS})

add_library(emnapi STATIC ${EMNAPI_SRC})
target_include_directories(emnapi PUBLIC ${EMNAPI_INCLUDE})
target_link_options(emnapi INTERFACE "--js-library=${EMNAPI_JS_LIB}")

add_library(emnapi-mt STATIC ${EMNAPI_SRC} ${UV_SRC})
target_compile_options(emnapi-mt PRIVATE ${EMNAPI_MT_CFLAGS})
target_include_directories(emnapi-mt PUBLIC ${EMNAPI_INCLUDE})
target_link_options(emnapi-mt INTERFACE "--js-library=${EMNAPI_JS_LIB}")
if(EMNAPI_WORKER_POOL_SIZE)
  target_compile_definitions(emnapi-mt PRIVATE "EMNAPI_WORKER_POOL_SIZE=${EMNAPI_WORKER_POOL_SIZE}")
endif()
if(EMNAPI_NEXTTICK_TYPE)
  target_compile_definitions(emnapi-mt PRIVATE "EMNAPI_NEXTTICK_TYPE=${EMNAPI_NEXTTICK_TYPE}")
endif()
if(EMNAPI_USE_PROXYING)
  target_compile_definitions(emnapi-mt PRIVATE "EMNAPI_USE_PROXYING=${EMNAPI_USE_PROXYING}")
endif()

install(TARGETS emnapi DESTINATION "lib/${PROJECT_NAME}")
install(TARGETS emnapi DESTINATION "lib/${CMAKE_LIBRARY_ARCHITECTURE}")
install(TARGETS emnapi-mt DESTINATION "lib/${PROJECT_NAME}")
install(TARGETS emnapi-mt DESTINATION "lib/${CMAKE_LIBRARY_ARCHITECTURE}")
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
endif()
