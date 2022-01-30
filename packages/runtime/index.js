if (process.env.NODE_ENV === 'production') {
  module.exports = require('./dist/emnapi.min.js')
} else {
  module.exports = require('./dist/emnapi.js')
}
