//const csvPlugin = require("./craco-plugin-csv-loader.js");

//const { addBeforeLoader } = require("@craco/craco/lib/loaders");
const { loaderByName, addBeforeLoader } = require("@craco/craco");
const path = require("path");

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
