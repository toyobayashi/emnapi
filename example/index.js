(function () {
  var Module, emnapi;
  if (typeof window !== 'undefined') {
    Module = window.Module;
    emnapi = window.emnapi;
  } else {
    Module = require('./build/hello.js');
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
    var msg = 'hello ' + binding.hello();
    if (typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      console.log(msg);
    }
  }
})();
