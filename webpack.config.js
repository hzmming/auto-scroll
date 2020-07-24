const path = require("path");
const webpack = require("webpack");
const { version, author } = require("./package.json");

const banner =
  `AutoScroll.js v${version}\n` +
  `(c) 2019-${new Date().getFullYear()} ${author}\n` +
  `Released under the MIT License.`;

module.exports = {
  entry: "./src/index.js", // 相对路径
  plugins: [
    // 如果有用其它压缩插件需注意下位置，别被其它插件给当无用注释清除了
    new webpack.BannerPlugin({
      entryOnly: true, // 是否仅在入口包中输出 banner 信息
      banner,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ["babel-loader"],
        exclude: "/node_modules/",
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "auto-scroll.js",
    library: "AutoScroll",
    // 该值默认undefined，设这个值主要因为使用 export default xxx 导出的模块，在浏览器使用时变成了 xxx.default
    libraryExport: "default",
    libraryTarget: "umd",
  },
};
