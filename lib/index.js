const { types } = require('@babel/core');
const { replaceDynamicImport, parseImport, createImports, parseExports, getConfig, createExportObject } = require('./lib');
const { buildModuleTemplate } = require('./templates');
const Logger = require('@ui5/logger').getLogger("babel-plugin-ui5-esm");

/**
 * ES Modules to SAP UI5 Module transformer
 * Transforms imports and exports to sap.ui.define
 * @returns {babel.PluginObj}
 */
module.exports = function (api, options) {
    let run = [];
    let isAMDModule = false;
    let config;

    let moduleImports = [];
    let moduleExports = [];
    let defaultExport;

    return {
        visitor: {
            ImportDeclaration(path) {
                if (run.includes(this)) return;
                moduleImports.push(parseImport(path));
                path.remove();
            },
            Import(path) {
                if (run.includes(this)) return;
                replaceDynamicImport(path);
            },
            CallExpression(path) {
                if (run.includes(this)) return;
                if (path.getSource().startsWith("sap.ui.define(")){ 
                    isAMDModule = true;
                    run.push(this);
                }
            },
            ExportNamedDeclaration(path) {
                if (run.includes(this)) return;

                const {exportImport, foundExports} = parseExports(path);
                if(exportImport) moduleImports.push(exportImport);
                if(foundExports) moduleExports.push(...foundExports);
            },
            ExportDefaultDeclaration(path) {
                if (run.includes(this)) return;

                defaultExport = path.node.declaration;

                path.remove();
            },
            Program: {
                enter(path) {
                    if (run.includes(this)) return;
                    config = getConfig(path.container.comments);
                    if(config.dontChange === true) run.push(this);

                    //Reset
                    moduleImports = [];
                    moduleExports = [];
                    defaultExport = undefined;
                    isAMDModule = false;
                },
                exit(path) {
                    if (run.includes(this)) return;
                    run.push(this);

                    if (isAMDModule) return;
                    if (config.isModule === false) return;
                    if (moduleImports.length === 0 && moduleExports.length === 0 && defaultExport === undefined) {
                        // unless isModule is set specificly to true, don't wrap in ui5 module (exit function)
                        if(config.isModule !== undefined && config.isModule !== true) return;
                    }


                    const { importPaths, importSpecifiers, preBody, toExport } = createImports(moduleImports);
                    moduleExports.push(...toExport);

                    if(defaultExport && moduleExports.length > 0 && !options.noWarnings) {
                        Logger.warn("Using named and default exports at the same time may lead to unexpected behaviour");
                    }

                    let exportsPostBody = createExportObject(moduleExports, defaultExport);

                    let ast = buildModuleTemplate({
                        imports: types.arrayExpression(importPaths),
                        params: importSpecifiers,
                        body: path.node.body,
                        exportFlag: config.globalExport,
                        preBody: [...preBody],
                        postBody: [...exportsPostBody]
                    });
                    path.replaceWith(
                        types.program([
                            ast
                        ])
                    );
                    
                }
            }
        }
    }
}