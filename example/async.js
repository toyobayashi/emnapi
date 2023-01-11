(function () {
  var Module, emnapi;
  if (typeof window !== 'undefined') {
    Module = window.emscriptenInitAsyncModule;
    emnapi = window.emnapi;
  } else {
    Module = require('./build/async.js');
    emnapi = require('@tybys/emnapi-runtime');
  }

  var emnapiContext = emnapi.createContext();

  if (typeof Module === 'function') {
    Module().then(main);
  } else {
    Module.onRuntimeInitialized = function () {
      main(Module);
    };
  }

  function main (Module) {
    var binding = Module.emnapiInit({ context: emnapiContext });
    Promise.all(Array.from({ length: 4 }, () => binding.async_method()));
  };
})();
