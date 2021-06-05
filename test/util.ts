import { join } from 'path'

export function getEntry (targetName: string): string {
  return join(__dirname, `../.cgenbuild/${process.env.NODE_ENV === 'production' ? 'Release' : 'Debug'}/${targetName}.js`)
}
