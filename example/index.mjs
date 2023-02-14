import { getDefaultContext } from '@emnapi/runtime'
import initModule from './build/hello.js'

const Module = await initModule()

main(Module)

function main (Module) {
  var binding = Module.emnapiInit({ context: getDefaultContext() })
  var msg = 'hello ' + binding.hello()
  if (typeof window !== 'undefined') {
    window.alert(msg)
  } else {
    console.log(msg)
  }
}
