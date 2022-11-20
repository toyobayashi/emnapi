/* eslint-disable */

var Module = typeof Module != "undefined" ? Module : {};
Module.preRun = [function () {
  if (typeof ENV !== 'undefined') {
    ENV.UV_THREADPOOL_SIZE = '2'
  }
}]
