(function () {
  var Module;
  if (typeof window !== 'undefined') {
    Module = window.Module;
  } else {
    Module = require('./build/async.js');
    Module.emnapiRuntime = require('@tybys/emnapi-runtime')
  }

  Module.onEmnapiInitialized = function (err, emnapiExports) {
    if (err) {
      console.error(err);
    } else {
      console.log('onEmnapiInitialized', emnapiExports === Module.emnapiExports);
    }
  };

  Module.onRuntimeInitialized = function () {
    console.log('onRuntimeInitialized');
    if (!('emnapiExports' in Module)) {
      return;
    }
    var binding = Module.emnapiExports;
    Promise.all(Array.from({ length: 4 }, () => binding.async_method()))
  };
})();
