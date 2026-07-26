import { Volume, createFsFromVolume } from 'memfs-browser'

const fs = createFsFromVolume(Volume.fromJSON({ '/': null }))

export const existsSync = fs.existsSync.bind(fs)
export const readFileSync = fs.readFileSync.bind(fs)
export default fs
