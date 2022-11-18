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
set(EMNAPI_JS_LIB_NO_RUNTIME "${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi_no_runtime.js")

add_library(uv STATIC ${UV_SRC})
target_include_directories(uv PUBLIC ${EMNAPI_INCLUDE})
target_compile_options(uv PUBLIC "-sUSE_PTHREADS=1")
target_link_options(uv INTERFACE "-sUSE_PTHREADS=1")

add_library(emnapi STATIC ${EMNAPI_SRC})
target_include_directories(emnapi PUBLIC ${EMNAPI_INCLUDE})

add_library(emnapi-mt STATIC ${EMNAPI_SRC})
target_compile_options(emnapi-mt PUBLIC "-sUSE_PTHREADS=1")
target_link_options(emnapi-mt INTERFACE "-sUSE_PTHREADS=1")
target_include_directories(emnapi-mt PUBLIC ${EMNAPI_INCLUDE})

add_library(emnapi_full INTERFACE)
target_link_options(emnapi_full INTERFACE "--js-library=${EMNAPI_JS_LIB}")
target_link_libraries(emnapi_full INTERFACE emnapi)

add_library(emnapi_noruntime INTERFACE)
target_link_options(emnapi_noruntime INTERFACE "--js-library=${EMNAPI_JS_LIB_NO_RUNTIME}")
target_link_libraries(emnapi_noruntime INTERFACE emnapi)

add_library(emnapi_full-mt INTERFACE)
target_link_options(emnapi_full-mt INTERFACE "--js-library=${EMNAPI_JS_LIB}")
target_link_libraries(emnapi_full-mt INTERFACE emnapi-mt uv)

add_library(emnapi_noruntime-mt INTERFACE)
target_link_options(emnapi_noruntime-mt INTERFACE "--js-library=${EMNAPI_JS_LIB_NO_RUNTIME}")
target_link_libraries(emnapi_noruntime-mt INTERFACE emnapi-mt uv)

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
    ${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi_no_runtime.js
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
