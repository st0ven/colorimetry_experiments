//const csvPlugin = require("./craco-plugin-csv-loader.js");

//const { addBeforeLoader } = require("@craco/craco/lib/loaders");
const { loaderByName, addBeforeLoader } = require("@craco/craco");

module.exports = {
  webpack: {
    configure: function (webpackConfig) {
      const csvLoader = {
        test: /\.csv$/,
        use: ["csv-loader"],
      };

      const workerLoader = {
        test: /\.worker\.js$/,
        loader: "worker-loader",
        options: {
          inline: "fallback",
        },
      };

      addBeforeLoader(webpackConfig, loaderByName("file-loader"), csvLoader);
      addBeforeLoader(webpackConfig, loaderByName("ts-loader"), workerLoader);

      return webpackConfig;
    },
    resolve: {
      extensions: [
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
      ],
    },
  },
};
