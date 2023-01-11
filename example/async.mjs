import { createContext } from '@tybys/emnapi-runtime'
import initModule from './build/async.js'

const emnapiContext = createContext()

const Module = await initModule()

await main(Module)

async function main (Module) {
  var binding = Module.emnapiInit({ context: emnapiContext });
  await Promise.all(Array.from({ length: 4 }, () => binding.async_method()))
}
