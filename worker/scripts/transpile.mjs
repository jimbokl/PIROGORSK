import ts from 'typescript';

/** Small local bundling helper. Refuse unknown imports rather than silently dropping them. */
export function plainJavaScript(source, allowedImports = [], removeExports = true) {
  const result = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
    transformers: { before: [context => file => {
      const visit = node => {
        if (ts.isImportDeclaration(node)) {
          if (!allowedImports.includes(node.moduleSpecifier.text)) throw new Error(`Unbundled import: ${node.moduleSpecifier.text}`);
          return undefined;
        }
        if (removeExports && (ts.isVariableStatement(node) || ts.isFunctionDeclaration(node))) {
          const modifiers = node.modifiers?.filter(modifier => modifier.kind !== ts.SyntaxKind.ExportKeyword);
          node = ts.isVariableStatement(node) ? context.factory.updateVariableStatement(node, modifiers, node.declarationList)
            : context.factory.updateFunctionDeclaration(node, modifiers, node.asteriskToken, node.name, node.typeParameters, node.parameters, node.type, node.body);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(file, visit);
    }] },
  });
  return result.outputText.replace(/^export \{\};\s*$/gm, '');
}
