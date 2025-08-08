/** @public */
export interface LoadPayload {
  wasmModule: WebAssembly.Module
  wasmMemory: WebAssembly.Memory
  sab?: Int32Array
}

/** @public */
export interface LoadedPayload {}

/** @public */
export interface StartPayload {
  tid: number
  arg: number
  sab?: Int32Array
}

/** @public */
export interface CleanupThreadPayload {
  tid: number
}

/** @public */
export interface TerminateAllThreadsPayload {}

/** @public */
export interface SpawnThreadPayload {
  startArg: number
  errorOrTid: number
}

/** @public */
export interface CommandPayloadMap {
  load: LoadPayload
  loaded: LoadedPayload
  start: StartPayload
  'cleanup-thread': CleanupThreadPayload
  'terminate-all-threads': TerminateAllThreadsPayload
  'spawn-thread': SpawnThreadPayload
}

/** @public */
export type CommandType = keyof CommandPayloadMap

/** @public */
export interface CommandInfo<T extends CommandType> {
  type: T
  payload: CommandPayloadMap[T]
}

/** @public */
export interface MessageEventData<T extends CommandType> {
  __emnapi__: CommandInfo<T>
}

export function createMessage<T extends CommandType> (type: T, payload: CommandPayloadMap[T]): MessageEventData<T> {
  return {
    __emnapi__: {
      type,
      payload
    }
  }
}
