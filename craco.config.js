//const csvPlugin = require("./craco-plugin-csv-loader.js");

//const { addBeforeLoader } = require("@craco/craco/lib/loaders");
const { loaderByName, addBeforeLoader } = require("@craco/craco");

module.exports = {
  /*webpack: {
    plugins: [
      {
        plugin: csvPlugin,
        options: { test: /\.csv$/ },
      },
    ],
	},*/
  webpack: {
    configure: function (webpackConfig) {
      const csvLoader = {
        test: /\.csv$/,
        use: ["csv-loader"],
      };

      addBeforeLoader(webpackConfig, loaderByName("file-loader"), csvLoader);

      return webpackConfig;
    },
    resolve: {
      extensions: [
        ".js",
        ".jsx",
        ".ts",
        ".tsx",
        ".csv",
        ".css",
        ".module.css",
        ".scss",
        ".module.scss",
      ],
    },
  },
};
