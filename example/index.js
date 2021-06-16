(function () {
  var Module;
  if (typeof window !== 'undefined') {
    Module = window.Module;
  } else {
    Module = require('./build/hello.js');
  }

  Module.onRuntimeInitialized = function () {
    var binding = Module.emnapiExports;
    var msg = 'hello ' + binding.hello();
    if (typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      console.log(msg);
    }
  };
})();
