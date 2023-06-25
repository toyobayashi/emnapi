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
project(emnapibench)
add_compile_definitions(
  "NAPI_VERSION=9"
  "NAPI_DISABLE_CPP_EXCEPTIONS"
  "NODE_ADDON_API_ENABLE_MAYBE"
)
add_link_options(
  "-sMIN_CHROME_VERSION=84"
  "-sALLOW_MEMORY_GROWTH=1"
  "-sMODULARIZE=1"
)

add_library(fib STATIC "${CMAKE_CURRENT_SOURCE_DIR}/src/fib.c")

set(EMNAPI_FIND_NODE_ADDON_API ON)
add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../emnapi" "${CMAKE_CURRENT_BINARY_DIR}/emnapi")

add_executable(embindcpp "${CMAKE_CURRENT_SOURCE_DIR}/src/bind.cpp")
target_link_libraries(embindcpp PRIVATE embind fib)
target_link_options(embindcpp PRIVATE "-sEXPORT_NAME=embindcpp")

add_executable(emnapic "${CMAKE_CURRENT_SOURCE_DIR}/src/lib.c")
target_link_libraries(emnapic PRIVATE emnapi-basic fib)
target_link_options(emnapic PRIVATE
  "-sEXPORTED_FUNCTIONS=['_napi_register_wasm_v1','_malloc','_free']"
  "-sEXPORT_NAME=emnapic"
)

add_executable(emnapicpp "${CMAKE_CURRENT_SOURCE_DIR}/src/lib.cpp")
target_link_libraries(emnapicpp PRIVATE emnapi-basic fib)
target_link_options(emnapicpp PRIVATE
  "-sEXPORTED_FUNCTIONS=['_napi_register_wasm_v1','_malloc','_free']"
  "-sEXPORT_NAME=emnapicpp"
)
