cmake_minimum_required(VERSION 3.9)

project(emnapiexample)

add_executable(hello
  hello.c
)

execute_process(COMMAND node -p "require('@tybys/emnapi').include"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE EMNAPI_INCLUDE_DIR
)
string(REGEX REPLACE "[\r\n\"]" "" EMNAPI_INCLUDE_DIR ${EMNAPI_INCLUDE_DIR})

execute_process(COMMAND node -p "require('@tybys/emnapi').js_library"
  WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
  OUTPUT_VARIABLE EMNAPI_JS_LIBRARY
)
string(REGEX REPLACE "[\r\n\"]" "" EMNAPI_JS_LIBRARY ${EMNAPI_JS_LIBRARY})

message(${EMNAPI_INCLUDE_DIR})
message(${EMNAPI_JS_LIBRARY})

target_include_directories(hello PRIVATE ${EMNAPI_INCLUDE_DIR})
target_link_options(hello PRIVATE
  "-sALLOW_MEMORY_GROWTH=1"
  "-sNODEJS_CATCH_EXIT=0"
  "-sEXPORTED_FUNCTIONS=['_malloc','_free']"
  "--js-library=${EMNAPI_JS_LIBRARY}"
)
