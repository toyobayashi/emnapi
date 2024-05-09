export const ENVIRONMENT_IS_NODE = typeof process === 'object' && process !== null &&
  typeof process.versions === 'object' && process.versions !== null &&
  typeof process.versions.node === 'string'

export function getPostMessage (options: { postMessage?: (message: any) => void }): ((message: any) => void) | undefined {
  return typeof options.postMessage === 'function'
    ? options.postMessage
    : typeof postMessage === 'function'
      ? postMessage
      : undefined
}
