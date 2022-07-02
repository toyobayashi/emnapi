import { HandleScope } from './HandleScope'
import type { IHandleScope } from './HandleScope'
import type { Env } from './env'
import type { Handle } from './Handle'

const rootScope = HandleScope.create(null)

// eslint-disable-next-line prefer-const
export let currentScope: IHandleScope | null = null

export function getCurrentScope (): IHandleScope | null {
  return currentScope
}

export function addToCurrentScope<V> (envObject: Env, value: V): Handle<V> {
  return currentScope!.add(envObject, value)
}

export function openScope<Scope extends HandleScope> (envObject: Env, ScopeConstructor = HandleScope): Scope {
  if (currentScope) {
    const scope = ScopeConstructor.create(currentScope)
    currentScope.child = scope
    currentScope = scope
  } else {
    currentScope = rootScope
  }

  envObject.openHandleScopes++
  return currentScope as Scope
}

export function closeScope (envObject: Env, scope: IHandleScope): void {
  if (scope === currentScope) {
    currentScope = scope.parent
  }
  if (scope.parent) {
    scope.parent.child = scope.child
  }
  if (scope.child) {
    scope.child.parent = scope.parent
  }
  if (scope === rootScope) {
    scope.clearHandles()
    scope.child = null
  } else {
    scope.dispose()
  }
  envObject.openHandleScopes--
}
