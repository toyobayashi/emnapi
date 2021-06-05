import { join } from 'path'

function getEntry (targetName: string): string {
  return join(__dirname, `../.cgenbuild/${process.env.NODE_ENV === 'production' ? 'Release' : 'Debug'}/${targetName}.${process.env.EMNAPI_TEST_NATIVE ? 'node' : 'js'}`)
}

export function load<Mod = any> (targetName: string): Promise<Mod> {
  const request = getEntry(targetName)
  const mod = require(request)

  return typeof mod.default === 'function' ? mod.default().then(({ Module }: { Module: any }) => Module.emnapiExports) : Promise.resolve(mod)
}
