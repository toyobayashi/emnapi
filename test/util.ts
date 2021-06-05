import { join } from 'path'

export function getEntry (targetName: string): string {
  return join(__dirname, `../.cgenbuild/Debug/${targetName}.js`)
}
