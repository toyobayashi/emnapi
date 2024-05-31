export interface LoadPayload {
  wasmModule: WebAssembly.Module
  wasmMemory: WebAssembly.Memory
  sab?: Int32Array
}

export interface LoadedPayload {}

export interface StartPayload {
  tid: number
  arg: number
  sab?: Int32Array
}

export interface CleanupThreadPayload {
  tid: number
}

export interface TerminateAllThreadsPayload {}

export interface SpawnThreadPayload {
  startArg: number
  errorOrTid: number
}

export interface CommandPayloadMap {
  load: LoadPayload
  loaded: LoadedPayload
  start: StartPayload
  'cleanup-thread': CleanupThreadPayload
  'terminate-all-threads': TerminateAllThreadsPayload
  'spawn-thread': SpawnThreadPayload
}

type CommandType = keyof CommandPayloadMap

export interface CommandInfo<T extends CommandType> {
  type: CommandType
  payload: CommandPayloadMap[T]
}

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
