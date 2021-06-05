const path = require('path')

const include = path.join(__dirname, 'include')
const includeDir = path.relative(process.cwd(), include)

exports.include = include
exports.include_dir = includeDir
