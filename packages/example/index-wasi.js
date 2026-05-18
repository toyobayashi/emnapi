import { createContext } from '@emnapi/runtime'
import init from './wasi-module-loader.js'

const emnapiCtx = createContext()

init(new URL('./out/wasi-sdk/binding.wasm', import.meta.url), {
  context: emnapiCtx,
  asyncWorkPoolSize: 4,
}).then(({ instance, napiModule }) => {
  const binding = napiModule.exports
  binding.run((current, total) => {
    console.log(`run ${current} / ${total}`)
  }, () => {
    console.log('done')
    instance.exports.uv_library_shutdown()
    emnapiCtx.destroy()
  })
})
