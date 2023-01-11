(function () {
  var Module, emnapi;
  if (typeof window !== 'undefined') {
    Module = window.Module;
    emnapi = window.emnapi;
  } else {
    Module = require('./build/async.js');
    emnapi = require('@tybys/emnapi-runtime');
  }

  var emnapiContext = emnapi.createContext();

  Module.onRuntimeInitialized = function () {
    console.log('onRuntimeInitialized');
    var binding = Module.emnapiInit({ context: emnapiContext });
    Promise.all(Array.from({ length: 4 }, () => binding.async_method()))
  };
})();
