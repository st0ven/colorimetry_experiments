//const csvPlugin = require("./craco-plugin-csv-loader.js");

//const { addBeforeLoader } = require("@craco/craco/lib/loaders");
const { loaderByName, addBeforeLoader } = require("@craco/craco");
const path = require("path");
const TsConfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const resolveExtensions = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".d.ts",
  ".csv",
  ".css",
  ".module.css",
  ".scss",
  ".module.scss",
];

module.exports = {
  webpack: {
    alias: {
      "@api": path.join(path.resolve(__dirname, "../src/client/api")),
      "@components": path.join(
        path.resolve(__dirname, "../src/client/components")
      ),
      "@containers": path.join(
        path.resolve(__dirname, "../src/client/containers")
      ),
      "@hooks": path.join(path.resolve(__dirname, "../src/client/hooks")),
      "@lib": path.join(path.resolve(__dirname, "../src/lib")),
      "@rendering": path.join(
        path.resolve(__dirname, "../src/client/rendering")
      ),
      "@res": path.join(path.resolve(__dirname, "../src/client/res")),
    },
    configure: function (webpackConfig) {
      const csvLoader = {
        test: /\.csv$/,
        use: ["csv-loader"],
      };

      addBeforeLoader(webpackConfig, loaderByName("file-loader"), csvLoader);

      return webpackConfig;
    },
    resolve: {
      plugins: [
        new TsConfigPathsPlugin({
          //configFile: path.resolve(__dirname, "./tsconfig-server.json"),
          extensions: resolveExtensions,
        }),
      ],
      extensions: resolveExtensions,
    },
  },
};
