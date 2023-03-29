#![no_main]

// use napi::*;

// #[cfg(target_arch = "wasm32")]
// use napi::bindgen_prelude::*;
// #[cfg(target_arch = "wasm32")]
// use napi_sys::*;

// #[macro_use]
// extern crate napi_derive;

// fn sum(a: i32, b: i32) -> i32 {
//   a + b
// }

// #[js_function(2)]
// fn sum_js(ctx: CallContext) -> napi::Result<napi::JsNumber> {
//   let arg0 = ctx.get::<napi::JsNumber>(0)?.get_int32()?;
//   let arg1 = ctx.get::<napi::JsNumber>(1)?.get_int32()?;
//   let ret = sum(arg0, arg1);
//   ctx.env.create_int32(ret)
// }

// fn module_register(_env: napi::Env, mut exports: napi::JsObject) -> napi::Result<()> {
//   exports.create_named_method("sum", sum_js)?;

//   Ok(())
// }

// #[cfg(not(target_arch = "wasm32"))]
// #[module_exports]
// fn init(exports: napi::JsObject, env: napi::Env) -> napi::Result<()> {
//   module_register(env, exports)
// }

// #[cfg(target_arch = "wasm32")]
// #[no_mangle]
// pub unsafe extern "C" fn napi_register_wasm_v1(env: napi_env, exports: napi_value) -> () {
//   let env_object = napi::Env::from_raw(env);
//   let exports_object = napi::JsObject::from_napi_value(env, exports).unwrap();
//   module_register(env_object, exports_object).unwrap();
// }

use napi_derive::napi;

#[napi]
fn fibonacci(n: u32) -> u32 {
  match n {
    1 | 2 => 1,
    _ => fibonacci(n - 1) + fibonacci(n - 2),
  }
}

#[napi]
fn sum(a: i32, b: i32) -> i32 {
  a + b
}
