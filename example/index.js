(function () {
  var Module;
  if (typeof window !== 'undefined') {
    Module = window.Module;
  } else {
    Module = require('./build/hello.js');
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
    var msg = 'hello ' + binding.hello();
    if (typeof window !== 'undefined') {
      window.alert(msg);
    } else {
      console.log(msg);
    }
  };
})();
