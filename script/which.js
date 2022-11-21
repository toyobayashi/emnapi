#!/usr/bin/env node

'use strict'

/**
 * @param {string} cmd
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function which (cmd, env = process.env) {
  const PATH = process.platform === 'win32' ? env.Path : env.PATH
  const pathList = PATH ? (process.platform === 'win32' ? PATH.split(';') : PATH.split(':')) : undefined
  if (pathList === undefined || pathList.length === 0) return ''

  const path = require('path')
  const fs = require('fs')

  const PATHEXT = process.platform === 'win32' ? (env.PATHEXT ? env.PATHEXT : '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC;.RB;.RBW') : ''
  const extlist = process.platform === 'win32' ? PATHEXT.split(';').map(v => v.toLowerCase()) : ['', '.sh']
  for (let i = 0; i < pathList.length; i++) {
    const p = pathList[i]
    if (path.extname(cmd) === '') {
      for (let j = 0; j < extlist.length; j++) {
        const target = path.join(p, cmd + extlist[j])
        if (fs.existsSync(target)) {
          if (process.platform === 'win32') {
            return target
          }
          try {
            fs.accessSync(target, fs.constants.X_OK)
            return target
          } catch {}
        }
      }
    } else {
      const target = path.join(p, cmd)
      if (fs.existsSync(target)) {
        if (process.platform === 'win32') {
          return target
        }
        try {
          fs.accessSync(target, fs.constants.X_OK)
          return target
        } catch {}
      }
    }
  }

  return ''
}

exports.which = which
Object.defineProperty(exports, '__esModule', { value: true })

if (require.main === module) {
  const p = which(process.argv[2])
  if (p) {
    console.log(p)
  }
}
