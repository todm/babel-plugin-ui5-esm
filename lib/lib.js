const { types } = require('@babel/core');
const { buildImportDestructor, buildImportDefaultFallback, buildDynamicImport, buildExports, buildDefaultExport, buildImportNamespace } = require("./templates");

const UNNAMED_IMPORT_IDENTIFIER = "__unnamedImport";
const DEFAULT_IMPORT_IDENTIFIER = "__defaultImport";
const DESTRUCTURE_IMPORT_IDENTIFIER = "__destructureImport";

/**
 * Replaces import() with sap.ui.require();
 * @param {babel.NodePath} path 
 */
function replaceDynamicImport(path) {
    path.parentPath.replaceWith(
        buildDynamicImport({
            params: path.parent.arguments
        })
    );
}

/**
 * Parses import
 * @param {babel.NodePath} path 
 * @returns {ImportObject[]} results
 */
function parseImport(path) {
    const importSpecifiers = path.node.specifiers.map(specifier => ({
        type: specifier.type,
        import: specifier.imported ? specifier.imported.name : specifier.local.name,
        local: specifier.local.name
    }));

    return {
        importSpecifiers,
        importPath: path.node.source.value
    }
}

/**
 * Creates the import path and identifier arrays for use in template
 * @param {ImportObject[]} imports 
 * @returns {{importPaths: object[], importSpecifiers: object[], toExport: string[]}} lists for use in template
 */
function createImports(imports) {
    const importPaths = [
        types.stringLiteral("module"),
        types.stringLiteral("exports"),
        types.stringLiteral("require"),
    ];
    const importSpecifiers = [
        types.identifier("module"),
        types.identifier("exports"),
        types.identifier("require"),
    ];
    const toExport = [];
    const preBody = [];
    imports.forEach((ci, i) => {
        importPaths.push(types.stringLiteral(ci.importPath));

        if (ci.importSpecifiers.length === 0) { // path only imports
            importSpecifiers.push(types.identifier(UNNAMED_IMPORT_IDENTIFIER + i));
            return;
        }

        if (ci.importSpecifiers.length === 1 && ci.importSpecifiers[0].type === "ImportDefaultSpecifier") { //import default only
            importSpecifiers.push(types.identifier(DEFAULT_IMPORT_IDENTIFIER + i));
            preBody.push(buildImportDefaultFallback({ import: DEFAULT_IMPORT_IDENTIFIER + i, name: ci.importSpecifiers[0].local }));
            return;
        }

        // import named (and default)
        const defaultImport = ci.importSpecifiers.find(cs => cs.type === "ImportDefaultSpecifier");
        const importSpecifier = DESTRUCTURE_IMPORT_IDENTIFIER + i;
        importSpecifiers.push(types.identifier(importSpecifier));
        if (defaultImport) {
            preBody.push(buildImportDefaultFallback({ import: importSpecifier, name: defaultImport.local }));
        }
        ci.importSpecifiers.filter(cs => cs.type === "ImportSpecifier").forEach(cs => {
            preBody.push(
                buildImportDestructor({
                    local: cs.local,
                    obj: importSpecifier,
                    name: cs.import
                })
            );
        });

        ci.importSpecifiers.filter(cs => cs.type === "ImportNamespaceSpecifier").forEach(cs => {
            preBody.push(
                buildImportNamespace({
                    local: cs.local,
                    obj: importSpecifier
                })
            );
        });

        ci.importSpecifiers.filter(cs => cs.type === "ExportSpecifier").forEach(cs => {
            toExport.push({ out: cs.local, local: importSpecifier + "." + cs.local });
        });
    });
    return {
        importPaths,
        importSpecifiers,
        preBody,
        toExport
    }
}


/**
 * Parses incoming exports
 * @param {babel.NodePath} path 
 * @returns {{exportImport?: ImportObject, foundExports?: string[]}}
 */
function parseExports(path) {
    /**
     * @type {ImportObject}
     */
    let exportImport = null;
    let foundExports = [];
    if (path.node.source) {
        // export x from 'source'
        exportImport = {
            importPath: path.node.source.value,
            importSpecifiers: null
        }

        if (path.node.specifiers) {
            exportImport.importSpecifiers = path.node.specifiers.map(s => ({
                type: s.type,
                import: s.imported ? s.imported.name : s.local.name,
                local: s.local.name
            }));
        }
        path.remove();
        return {
            exportImport
        }
    }

    if (path.node.specifiers && path.node.specifiers.length > 0) {
        let e = path.node.specifiers.map(s => s.local.name);
        foundExports.push(...e);
        path.remove();
        return {
            foundExports
        }
    }

    if (path.node.declaration) {
        // export class A {}
        if (path.node.declaration.id) {
            foundExports.push(path.node.declaration.id.name);
        } else if (path.node.declaration.declarations) {
            path.node.declaration.declarations.forEach(d => {
                foundExports.push(d.id.name);
            })
        }
        path.replaceWith(path.node.declaration);
        return {
            foundExports
        }
    }
    return {}
}

function createExportObject(moduleExports, defaultExport) {
    if(defaultExport && !moduleExports.length) return [buildDefaultExport({
        node: types.toExpression(defaultExport)
    })];

    let exportsObject = [];

    if(defaultExport) exportsObject.push(types.objectProperty(
        types.identifier("default"),
        types.toExpression(defaultExport),
    ));

    exportsObject.push(...moduleExports.map(e => {
        if (typeof e === "object") return types.objectProperty(
            types.identifier(e.out),
            types.identifier(e.local),
        );
        return types.objectProperty(
            types.identifier(e),
            types.identifier(e)
        );
    }));

    if(!exportsObject.length) return [];

    exportsObject.push(types.objectProperty(
        types.identifier("__esModule"),
        types.booleanLiteral(true)
    ))

    let obj = types.objectExpression(exportsObject);
    return [buildExports({
        moduleExports: obj
    })];
}

/**
 * Gets options from file comment
 * @param {Object[]} comments 
 * @returns {Object}
 */
function getConfig(comments) {
    let config = {
        isModule: undefined,
        globalExport: undefined,
        dontChange: false
    };
    comments.some(comment => {
        var value = comment.value.trim();
        try {
            let obj = JSON.parse(value);
            Object.assign(config, obj);
            return true;
        } catch(ex) {
            return false;
        }
    });
    return config;
}

module.exports = {
    replaceDynamicImport,
    parseImport,
    createImports,
    parseExports,
    getConfig,
    createExportObject
}

/**
 * @typedef {Object} ImportObject
 * @property {string} importPath - the path to import from
 * @property {Object[]} importSpecifiers - the specifier to use in the function
 * @property {string} importSpecifiers.type - the type of the specifier
 * @property {string} importSpecifiers.import - the name in the foreign module
 * @property {string} importSpecifiers.local - the name in the local module
 */