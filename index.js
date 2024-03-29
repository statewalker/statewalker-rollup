const { terser } = require("rollup-plugin-terser");
// import resolve from "@rollup/plugin-node-resolve";
const { nodeResolve } = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const inject = require("@rollup/plugin-inject");
const fs = require("fs");
const path = require("path");

// import builtins from "rollup-plugin-node-builtins";
// import globals from "rollup-plugin-node-globals";

module.exports = function ({ url }, options = {}) {
  const packageFilePath = path.join(path.dirname(new URL(url).pathname), "./package.json");
  const meta = JSON.parse(fs.readFileSync(packageFilePath, 'UTF-8'));
  const ns = meta.name.replace(/^@(.*)\/.*$/, '$1');
  const regexp = new RegExp(`^@(${ns})\\/(.*)$`, 'gi');
  const replace = (name) => name.replace(regexp, '$1.$2'); // .replace(/[/-]/gi, '_');
  // const distFileName = meta.name.replace(regexp, '$1-$2');
  const distFileName = "index";
  const nsPackages = Object
    .keys(meta.dependencies || {})
    .filter(name => name.indexOf(`@${ns}`) === 0 && name !== `@${ns}/ns`)
    .reduce((index, name) => (index[name] = replace(name), index), {});

  const config = {
    input: "index.js",
    external: (options.external || []).concat(Object.keys(nsPackages)).filter(name => name !== `@${ns}/ns`),
    output: {
      file: `dist/${distFileName}.js`,
      name: replace(meta.name),
      format: "umd",
      indent: false,
      extend: true,
      banner: `// ${meta.name} v${meta.version} ${meta.homepage} Copyright ${(new Date).getFullYear()} ${meta.author.name}`,
      globals: Object.assign({}, options.globals || {}, nsPackages)
    },
    plugins: [
      inject(Object.assign({}, options.globals)),
      // builtins(),
      // globals(),
      nodeResolve({ preferBuiltins: false }),
      commonjs()
    ]
  };
  return [
    {
      ...config,
      output: {
        ...config.output,
        file: `dist/${distFileName}-umd.js`
      },
      plugins: [
        ...config.plugins,
      ]
    },
    config,
    {
      ...config,
      output: {
        ...config.output,
        file: `dist/${distFileName}-umd.min.js`
      },
      plugins: [
        ...config.plugins,
        terser({
          output: {
            preamble: config.output.banner
          }
        })
      ]
    },

    {
      ...config,
      output: {
        ...config.output,
        file: `dist/${distFileName}.js`,
        format: "es"
      },
    },
    {
      ...config,
      output: {
        ...config.output,
        file: `dist/${distFileName}.min.js`,
        format: "es"
      },
      plugins: [
        ...config.plugins,
        terser({
          output: {
            preamble: config.output.banner
          }
        })
      ]
    }
  ];
}
