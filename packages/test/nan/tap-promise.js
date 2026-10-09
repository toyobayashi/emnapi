'use strict'

module.exports = function waitForTap (test) {
  return new Promise((resolve, reject) => {
    let output = ''
    test.output.on('data', chunk => { output += chunk })
    test.once('end', () => {
      if (test.results.ok) resolve()
      else reject(new Error(output || `${test.conf.name}: TAP test failed`))
    })
  })
}
