import { Project, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

const project = new Project({
    tsConfigFilePath: 'tsconfig.base.json',
});

// Add our explicit source files. We want everything in libs and apps that is TS but not tests.
project.addSourceFilesAtPaths([
    'libs/**/*.ts',
    'apps/**/*.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/environments/**'
]);

let markdown = '# Envello AI Context (Codebase Structure)\n\n';
markdown += 'This document is auto-generated to provide an LLM or AI agent with the entire structural schema of the workspace, excluding implementation details.\n\n';

for (const sourceFile of project.getSourceFiles()) {
    let filePathStr: string = sourceFile.getFilePath().toString();
    // Ensure we get a nice relative path format for consistency
    const cwd = process.cwd();
    if (filePathStr.startsWith(cwd)) {
        filePathStr = filePathStr.replace(cwd, '');
    }

    // Make sure it starts with a slash if not
    if (!filePathStr.startsWith('/')) {
        filePathStr = '/' + filePathStr;
    }

    let fileContent = '';

    const classes = sourceFile.getClasses();
    for (const c of classes) {
        if (c.isExported()) {
            const clsName = c.getName() || 'AnonymousClass';
            fileContent += `### Class: ${clsName}\n\`\`\`typescript\nclass ${clsName} {\n`;
            c.getProperties().forEach(p => {
                if (!p.hasModifier(SyntaxKind.PrivateKeyword) && !p.hasModifier(SyntaxKind.ProtectedKeyword)) {
                    fileContent += `  ${p.getName()}${p.hasQuestionToken() ? '?' : ''}: ${p.getTypeNode()?.getText() || 'any'};\n`;
                }
            });
            c.getMethods().forEach(m => {
                if (!m.hasModifier(SyntaxKind.PrivateKeyword) && !m.hasModifier(SyntaxKind.ProtectedKeyword)) {
                    const params = m.getParameters().map(param => `${param.getName()}: ${param.getTypeNode()?.getText() || 'any'}`).join(', ');
                    fileContent += `  ${m.getName()}(${params}): ${m.getReturnTypeNode()?.getText() || 'any'};\n`;
                }
            });
            fileContent += '}\n\`\`\`\n\n';
        }
    }

    const interfaces = sourceFile.getInterfaces();
    for (const i of interfaces) {
        if (i.isExported()) {
            const intName = i.getName();
            fileContent += `### Interface: ${intName}\n\`\`\`typescript\ninterface ${intName} {\n`;
            i.getProperties().forEach(p => {
                fileContent += `  ${p.getName()}${p.hasQuestionToken() ? '?' : ''}: ${p.getTypeNode()?.getText() || 'any'};\n`;
            });
            i.getMethods().forEach(m => {
                const params = m.getParameters().map(param => `${param.getName()}: ${param.getTypeNode()?.getText() || 'any'}`).join(', ');
                fileContent += `  ${m.getName()}(${params}): ${m.getReturnTypeNode()?.getText() || 'any'};\n`;
            });
            fileContent += '}\n\`\`\`\n\n';
        }
    }

    const typeAliases = sourceFile.getTypeAliases();
    for (const t of typeAliases) {
        if (t.isExported()) {
            fileContent += `### Type: ${t.getName()}\n\`\`\`typescript\ntype ${t.getName()} = ${t.getTypeNode()?.getText() || 'any'};\n\`\`\`\n\n`;
        }
    }

    const functions = sourceFile.getFunctions();
    for (const f of functions) {
        if (f.isExported()) {
            const params = f.getParameters().map(param => `${param.getName()}: ${param.getTypeNode()?.getText() || 'any'}`).join(', ');
            fileContent += `### Function: ${f.getName()}\n\`\`\`typescript\nfunction ${f.getName()}(${params}): ${f.getReturnTypeNode()?.getText() || 'any'}\n\`\`\`\n\n`;
        }
    }

    if (fileContent.trim() !== '') {
        markdown += `## File: ${filePathStr}\n\n${fileContent}---\n\n`;
    }
}

const outputPath = path.join(process.cwd(), 'AI_CONTEXT.md');
fs.writeFileSync(outputPath, markdown);
console.log(`Successfully generated AI Context at: ${outputPath}`);
