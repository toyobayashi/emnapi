const path = require('path')
const { compile } = require('./index.js')

compile(path.join(__dirname, 'tsconfig.json'), { pureClass: false })
