'use strict'
Object.defineProperty(exports, '__esModule', { value: true })

const ts = require('typescript')

/**
 * @param {ts.Node} node
 */
function tryReplaceClassComment (node) {
  if (!ts.isVariableStatement(node)) return
  if (!node.declarationList) return
  if (!node.declarationList.declarations) return
  if (node.declarationList.declarations.length !== 1) return
  const varDecl = node.declarationList.declarations[0]
  if (!ts.isVariableDeclaration(varDecl)) return
  if (!varDecl.initializer) return
  if (!ts.isParenthesizedExpression(varDecl.initializer)) return
  const parenthesizedExpression = varDecl.initializer
  if (!ts.isCallExpression(parenthesizedExpression.expression)) return
  if (!ts.isPartiallyEmittedExpression(parenthesizedExpression.expression.expression)) return
  const leadingComments = ts.getSyntheticLeadingComments(parenthesizedExpression)
  if (leadingComments && leadingComments.length === 1 && leadingComments[0].text === '* @class ') {
    leadingComments[0].text = '#__PURE__'
    ts.setSyntheticLeadingComments(parenthesizedExpression, leadingComments)
  }
}

/**
 * @param {ts.Program} program
 * @returns {ts.TransformerFactory<ts.SourceFile>}
 */
function pureClassTransformer () {
  return (context) => {
    /** @type {ts.Visitor} */
    const visitor = (node) => {
      tryReplaceClassComment(node)
      return ts.visitEachChild(node, visitor, context)
    }

    return (src) => {
      if (src.isDeclarationFile) return src
      return ts.visitEachChild(src, visitor, context)
    }
  }
}

exports.default = pureClassTransformer
