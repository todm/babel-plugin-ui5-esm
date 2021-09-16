# babel-plugin-ui5-esm

Babel plugin to turn ESModules into ui5 AMD modules.
To use this plugin in a ui5 project you need a [babel task](https://github.com/todm/ui5-task-babel).

# Installation

Add the plugin to your project as a dev dependency.

```sh
npm i -D git+https://github.com/todm/babel-plugin-ui5-esm.git
```

Add the plugin to your babel configuration file

```yaml
# babel.config.json
{
    "plugins": [
        ["babel-plugin-ui5-esm"]
    ]
}
```

# Named and Default exports

You can use either named or default exports. The UI5 module system however doesn't support both at the same time. To combat this default exports will be exported as named exports with the name `default` when both named and default exports are used. When imported in other ESModules this case will be handled automatically. But giving such an export combination directly to the framework or to other non esmodules (e.g. exporting a controller) will result in errors.

Exporting both default and named exports in the same module will therfore produce a warning message in the console. If you want to disable it specify the option `"noWarnings": true` on the plugin.

# Configuration

## Plugin options
Plugin options are defined in the babel configuration
| Name       | Type      | Default | Description                    |
| ---------- | --------- | ------- | ------------------------------ |
| noWarnings | `boolean` | `false` | If warnings should be disabled |

## Per file options
Per file options are defined as a json string in a comment of the file
| Name         | Type      | Default     | Description                                    |
| ------------ | --------- | ----------- | ---------------------------------------------- |
| globalExport | `boolean` | `false`     | Sets the sap amd loader global export flag     |
| dontChange   | `boolean` | `false`     | If `true` the file won't be changed in any way |
| isModule     | `boolean` | `undefined` | If `undefined` the code will only be wrapped in a ui5 module when imports and/or exports are in it. If `false` all import and export statements will be removed but the code wont be wrapped as a ui5 module. If `true` the code will be wrapped as a ui5 modules even if no imports or exports are in it |

Per file options example:
```js
// {"globalExport": false, "dontChange": false, "isModule": true}
import foo from 'bar';
...
```