# babel-plugin-ui5-esm

Babel plugin to turn ESModules into ui5 AMD modules.
To use this plugin in a ui5 project you need a [babel task](https://github.com/todm/ui5-task-babel).

This plugin is a modification of [@babel/plugin-transform-modules-amd](https://babeljs.io/docs/en/babel-plugin-transform-modules-amd) with changes to make it compatible with ui5 moduled.

# Installation

Add the plugin to your project as a dev dependency.

```sh
npm i -D @todms/babel-plugin-ui5-esm
```

Add the plugin to your babel configuration file

```yaml
# babel.config.json
{
    "plugins": [
        ["@todms/babel-plugin-ui5-esm"]
    ]
}
```

# Named and Default exports

**:warning: Exporting both default and named exports at the same time will cause errors when loaded by ui5 directly.**

The ui5 module system supports only one singular export per module. Multiple exports will therefore be returned as an object. The default export will become a property with the name `default`. Since ui5 expects a singular export it won't get the correct default export when multiple exports are present.

**:heavy_check_mark: Make sure to only use one singular default export in files that are read directly by ui5 (e.g. a controller for a view, Component.js...)**

If the file will only be read by another ES module using default and named exports at the same time is fine and will be checked for automatically.



## Plugin options
See options for [@babel/plugin-transform-modules-amd](https://babeljs.io/docs/en/babel-plugin-transform-modules-amd)

and [@babel/plugin-transform-modules-commonjs](https://babeljs.io/docs/en/babel-plugin-transform-modules-commonjs)