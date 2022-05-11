'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const ts = require('typescript')

/**
 * @param {ts.TransformationContext=} context
 * @returns {typeof ts | import('typescript').NodeFactory}
 */
function getAstNodeFactory (context) {
  if (!context) return ts.factory ? ts.factory : ts
  return context.factory ? context.factory : getAstNodeFactory()
}

/**
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isVar (node) {
  return (
    (ts.isVariableDeclaration(node.parent) && node.parent.name === node) ||
    ts.isFunctionDeclaration(node.parent) ||
    ts.isClassDeclaration(node.parent) ||
    ts.isInterfaceDeclaration(node.parent) ||
    ts.isTypeAliasDeclaration(node.parent) ||
    ts.isEnumDeclaration(node.parent) ||
    ts.isModuleDeclaration(node.parent)
  )
}

/**
 * @param {ts.Program} program
 * @param {{ defines?: Record<string, any> }} config
 */
function defineTransformer (program, { defines = {} } = {}) {
  const defineKeys = Object.keys(defines)
  const typeChecker = program.getTypeChecker()
  return (
    /** @type {ts.TransformationContext} */
    context
  ) => {
    /** @type {import('typescript').NodeFactory} */
    const factory = getAstNodeFactory(context)

    /** @type {ts.Visitor} */
    const visitor = (node) => {
      if (ts.isSourceFile(node)) {
        return ts.visitEachChild(node, visitor, context)
      }

      if (defineKeys.length > 0) {
        if (ts.isIdentifier(node) &&
            node.text &&
            defineKeys.indexOf(node.text) !== -1 &&
            !ts.isPropertyAccessExpression(node.parent) &&
            (!ts.isCallExpression(node.parent) ||
              (ts.isCallExpression(node.parent) && (node.parent.arguments.indexOf(node) !== -1))
            ) &&
            !isVar(node) &&
            (() => {
              const nodeSymbol = typeChecker.getSymbolAtLocation(node)
              if (!nodeSymbol) return true
              if (!nodeSymbol.valueDeclaration) return false
              if (ts.isVariableDeclaration(nodeSymbol.valueDeclaration)) {
                if (ts.isVariableStatement(nodeSymbol.valueDeclaration.parent.parent)) {
                  return (nodeSymbol.valueDeclaration.parent.parent.modifiers &&
                    nodeSymbol.valueDeclaration.parent.parent.modifiers.filter(m => m.kind === ts.SyntaxKind.DeclareKeyword).length > 0)
                } else {
                  return false
                }
              } else if (ts.isFunctionDeclaration(nodeSymbol.valueDeclaration) || ts.isClassDeclaration(nodeSymbol.valueDeclaration) ||
                ts.isEnumDeclaration(nodeSymbol.valueDeclaration) || ts.isModuleDeclaration(nodeSymbol.valueDeclaration)
              ) {
                return (nodeSymbol.valueDeclaration.modifiers &&
                  nodeSymbol.valueDeclaration.modifiers.filter(m => m.kind === ts.SyntaxKind.DeclareKeyword).length > 0)
              } else if (ts.isInterfaceDeclaration(nodeSymbol.valueDeclaration) || ts.isTypeAliasDeclaration(nodeSymbol.valueDeclaration)) {
                return true
              } else {
                return false
              }
            })()
        ) {
          const identifier = node.text
          const value = defines[identifier]
          if (value === undefined) {
            return factory.createNumericLiteral('undefined')
          }
          if (value === null) {
            return factory.createNull()
          }
          if (Number.isNaN(value)) {
            return factory.createNumericLiteral('NaN')
          }
          if (typeof value === 'number') {
            return factory.createNumericLiteral(value)
          }
          if (typeof value === 'boolean') {
            return value ? factory.createTrue() : factory.createFalse()
          }
          if (typeof value === 'string') {
            return factory.createNumericLiteral(value)
          }
          if (typeof value === 'symbol') {
            const symbolString = value.toString()
            return factory.createNumericLiteral(`Symbol("${symbolString.substring(7, symbolString.length - 1)}")`)
          }
          if (value instanceof Date) {
            return factory.createNumericLiteral(`(new Date(${value.getTime()}))`)
          }
          if (value instanceof RegExp) {
            return factory.createRegularExpressionLiteral(value.toString())
          }
        }
      }

      return ts.visitEachChild(node, visitor, context)
    }
    return (/** @type {ts.SourceFile} */ node) => {
      if (node.isDeclarationFile) return node
      return ts.visitNode(node, visitor)
    }
  }
}

exports.default = defineTransformer
