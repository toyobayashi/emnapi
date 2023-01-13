import { createContext } from '@tybys/emnapi-runtime'
import initModule from './build/hello.js'

const emnapiContext = createContext()

const Module = await initModule()

main(Module)

function main (Module) {
  var binding = Module.emnapiInit({ context: emnapiContext })
  var msg = 'hello ' + binding.hello()
  if (typeof window !== 'undefined') {
    window.alert(msg)
  } else {
    console.log(msg)
  }
}
