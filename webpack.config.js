const path = require('path');
const webpack = require('webpack');
const package = require('./package');

module.exports = {
    entry: {
        'rest-resource': './dist/index.js',
        'rest-resource.min': './dist/index.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist/dom'),
        filename: '[name].js',
        library: 'Resource',
        libraryTarget: 'var',
        libraryExport: 'default'
    },
    devtool: 'source-map',
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                query: {
                    presets: [require.resolve('babel-preset-es2015')]
                }
            }
        ]
    },
    plugins: [
        new webpack.optimize.UglifyJsPlugin({
            include: /\.min\.js$/,
            compress: { warnings: false }
        }),
        new webpack.BannerPlugin(`REST Resource\n${package.repository.url}\n\n@author ${package.author}\n@link ${package.link}\n@version ${package.version}\n\nReleased under MIT License. See LICENSE.txt or http://opensource.org/licenses/MIT`)
    ]
}
