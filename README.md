# emnapi

[WIP] 尝试用 JavaScript 为 emscripten 实现 [Node-API](https://nodejs.org/dist/latest-v14.x/docs/api/n-api.html) (v14.16.0)

## 构建

设置 `$EMSDK` 环境变量为 emsdk 根目录，并确保 Emscripten 工具链二进制目录（`$EMSDK/upstream/emscripten`）和 CMake 在 `$PATH` 里

未安装 `make` 的 Windows 用户请使用 Visual Studio Developer Command Prompt 跑命令（需要用到 `nmake`）

```bash
npm install -g @tybys/cgen
npm install
npm run rebuild

# test
npm test
```

## 使用

Emscripten 需要 v2.0.13 以上的版本，开启 `DYNCALLS` 选项，链接上一步构建出来的 js 库

```
-I ./include
-sDYNCALLS=1
--js-library=./dist/library_napi.js
```

## 已实现

- [x] napi_get_last_error_info
- [ ] napi_get_undefined
- [ ] napi_get_null
- [ ] napi_get_global
- [ ] napi_get_boolean
- [ ] napi_create_object
- [ ] napi_create_array
- [ ] napi_create_array_with_length
- [ ] napi_create_double
- [x] napi_create_int32
- [ ] napi_create_uint32
- [ ] napi_create_int64
- [ ] napi_create_string_latin1
- [x] napi_create_string_utf8
- [ ] napi_create_string_utf16
- [ ] napi_create_symbol
- [x] napi_create_function
- [x] napi_create_error
- [ ] napi_create_type_error
- [ ] napi_create_range_error
- [ ] napi_typeof
- [ ] napi_get_value_double
- [ ] napi_get_value_int32
- [ ] napi_get_value_uint32
- [ ] napi_get_value_int64
- [ ] napi_get_value_bool
- [ ] napi_get_value_string_latin1
- [ ] napi_get_value_string_utf8
- [ ] napi_get_value_string_utf16
- [ ] napi_coerce_to_bool
- [ ] napi_coerce_to_number
- [ ] napi_coerce_to_object
- [ ] napi_coerce_to_string
- [ ] napi_get_prototype
- [ ] napi_get_property_names
- [ ] napi_set_property
- [ ] napi_has_property
- [ ] napi_get_property
- [ ] napi_delete_property
- [ ] napi_has_own_property
- [x] napi_set_named_property
- [ ] napi_has_named_property
- [ ] napi_get_named_property
- [ ] napi_set_element
- [ ] napi_has_element
- [ ] napi_get_element
- [ ] napi_delete_element
- [ ] napi_define_properties
- [ ] napi_is_array
- [ ] napi_get_array_length
- [ ] napi_strict_equals
- [ ] napi_call_function
- [ ] napi_new_instance
- [ ] napi_instanceof
- [ ] napi_get_cb_info
- [ ] napi_get_new_target
- [ ] napi_define_class
- [ ] napi_wrap
- [ ] napi_unwrap
- [ ] napi_remove_wrap
- [ ] napi_create_external
- [ ] napi_get_value_external
- [ ] napi_create_reference
- [ ] napi_delete_reference
- [ ] napi_reference_ref
- [ ] napi_reference_unref
- [ ] napi_get_reference_value
- [ ] napi_open_handle_scope
- [ ] napi_close_handle_scope
- [ ] napi_open_escapable_handle_scope
- [ ] napi_close_escapable_handle_scope
- [ ] napi_escape_handle
- [x] napi_throw
- [x] napi_throw_error
- [x] napi_throw_type_error
- [x] napi_throw_range_error
- [x] napi_is_error
- [ ] napi_is_exception_pending
- [ ] napi_get_and_clear_last_exception
- [ ] napi_is_arraybuffer
- [ ] napi_create_arraybuffer
- [ ] napi_create_external_arraybuffer
- [ ] napi_get_arraybuffer_info
- [ ] napi_is_typedarray
- [ ] napi_create_typedarray
- [ ] napi_get_typedarray_info
- [ ] napi_create_dataview
- [ ] napi_is_dataview
- [ ] napi_get_dataview_info
- [ ] napi_get_version
- [ ] napi_create_promise
- [ ] napi_resolve_deferred
- [ ] napi_reject_deferred
- [ ] napi_is_promise
- [ ] napi_run_script
- [ ] napi_adjust_external_memory
- [ ] napi_create_date
- [ ] napi_is_date
- [ ] napi_get_date_value
- [ ] napi_add_finalizer
- [ ] napi_create_bigint_int64
- [ ] napi_create_bigint_uint64
- [ ] napi_create_bigint_words
- [ ] napi_get_value_bigint_int64
- [ ] napi_get_value_bigint_uint64
- [ ] napi_get_value_bigint_words
- [ ] napi_get_all_property_names
- [x] napi_set_instance_data
- [x] napi_get_instance_data
- [ ] napi_detach_arraybuffer
- [ ] napi_is_detached_arraybuffer
- [ ] napi_type_tag_object
- [ ] napi_check_object_type_tag
- [ ] napi_object_freeze
- [ ] napi_object_seal
