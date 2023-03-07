const path = require('path');

module.exports = {
    entry: './datagen.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    devtool: 'inline-source-map',
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: 'datagen.js',
        path: path.resolve(__dirname, 'dist')
    }
};
