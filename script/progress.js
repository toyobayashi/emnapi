const fs = require('fs')
const path = require('path')

const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8')
const total = readme.match(/-\s\[[x ]\] \S+/g)
const implemented = readme.match(/-\s\[x\] \S+/g)
console.log(implemented.length + ' / ' + total.length + ' [' + Math.floor(100 * implemented.length / total.length) + '%]')
