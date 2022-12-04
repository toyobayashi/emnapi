function emnapiRuntimeInit (Module) {
  return new Promise(function (resolve, reject) {
    if ('emnapiRuntime' in Module) {
      if (typeof Module.emnapiRuntime === 'function') {
        resolve(Module.emnapiRuntime())
      } else {
        resolve(Module.emnapiRuntime)
      }
    } else if (typeof process === 'object' && typeof process.versions === 'object' && typeof process.versions.node === 'string') {
      var error = new Error('Emnapi runtime is not detected. Try to run "npm install @tybys/emnapi-runtime" first')
      if (typeof require === 'function') {
        try {
          resolve(require('@tybys/emnapi-runtime'))
        } catch (_) {
          reject(error)
        }
      } else {
        try {
          import('@tybys/emnapi-runtime').then(resolve, function () {
            reject(error)
          })
        } catch (_) {
          reject(error)
        }
      }
    } else {
      var result = (function () {
        if (typeof globalThis !== 'undefined') return globalThis;
        var g = (function () { return this })();
        if (
          !g &&
          (function () {
            var f;
            try {
              f = new Function();
            } catch (_) {
              return false;
            }
            return typeof f === 'function';
          })()
        ) {
          g = new Function('return this')();
        }

        if (!g) {
          if (typeof __webpack_public_path__ === 'undefined') {
            if (typeof global !== 'undefined') return global;
          }
          if (typeof window !== 'undefined') return window;
          if (typeof self !== 'undefined') return self;
        }

        return g;
      })().__emnapi_runtime__
      if (!result) {
        reject(new Error('Emnapi runtime is not detected. Check if the runtime code is imported or consider using builtin runtime js library.'))
      } else {
        resolve(result)
      }
    }
  }).then(function (result) {
    emnapi = result
  })
}
