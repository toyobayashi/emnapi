import init from './out/emscripten/binding.js'
import { createContext } from '@emnapi/runtime'

const emnapiCtx = createContext()

init().then((Module) => {
  const binding = Module.emnapiInit({
    context: emnapiCtx,
    asyncWorkPoolSize: 4
  })
  binding.run((current, total) => {
    console.log(`run ${current} / ${total}`)
  }, () => {
    console.log('done')
    Module._uv_library_shutdown()
    emnapiCtx.destroy()
  })
})
