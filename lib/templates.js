const { template } = require("@babel/core");

const buildModuleTemplate = template(`
    sap.ui.define(%%imports%%, function(%%params%%){
        %%preBody%%
        %%body%%
        %%postBody%%
    }, %%exportFlag%%);
`);

const buildImportDefaultFallback = template(`
    var %%name%% = typeof %%import%% === "object" && %%import%%.__esModule ? %%import%%.default : %%import%%;
`);

const buildImportDestructor = template(`
    var %%local%% = %%obj%%.%%name%%;
`);

const buildImportNamespace = template(`
    var %%local%% = %%obj%%;
`);

const buildDynamicImport = template(`
    sap.ui.require(%%params%%);
`);

const buildDefaultExport = template(`
    module.exports = %%node%%;
`);

const buildExports = template(`
    Object.assign(module.exports, %%moduleExports%%);
`);

module.exports = {
    buildModuleTemplate,
    buildImportDefaultFallback,
    buildImportDestructor,
    buildDynamicImport,
    buildDefaultExport,
    buildExports,
    buildImportNamespace
}