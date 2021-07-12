// EXPORT
const { src, dest, parallel, series, watch } = require('gulp');
const autoPrefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const sass = require('gulp-sass')(require('sass'));
const notify = require('gulp-notify');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const fileinclude = require('gulp-file-include');
const svgSprite = require('gulp-svg-sprite');
const ttf2woff = require('gulp-ttf2woff');
const ttf2woff2 = require('gulp-ttf2woff2');
const fs = require('fs');
const del = require('del');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const uglify = require('gulp-uglify-es').default;
const tiny = require('gulp-tinypng-compress');
const gutil = require('gulp-util');
const ftp = require('vinyl-ftp');



// ASSEMBLY

// fonts
const fonts = () => {
    src('./src/fonts/**.ttf')
        .pipe(ttf2woff())
        .pipe(dest('./app/fonts/'))
    return src('./src/fonts/**.ttf')
        .pipe(ttf2woff2())
        .pipe(dest('./app/fonts/'))
}


// svg sprites
const svgSprites = () => {
    return src('./src/img/**.svg')
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: '../sprite.svg'
                }
            }
        }))
        .pipe(dest('./app/img'))
}


// sass to css
const styles = () => {
    return src('./src/scss/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError()))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoPrefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('./app/css/'))
        .pipe(browserSync.stream())
}


// prefix html
const htmlInclude = () => {
    return src(['./src/index.html'])
        .pipe(fileinclude({
            prefix: '@',
            basepath: '@file'
        }))
        .pipe(dest('./app'))
        .pipe(browserSync.stream());
}


// dest img
const imgToApp = () => {
    return src(['./src/img/**.jpg', './src/img/**.png', './src/img/**.jpeg'])
        .pipe(dest('./app/img'))
}


// dest resources
const resources = () => {
    return src('./src/resources/**')
        .pipe(dest('./app'))
}


// delete folder
const clean = () => {
    return del(['app/*'])
}


// scripts
const scripts = () => {
    return src('./src/js/main.js')
        .pipe(webpackStream({
            output: {
                filename: 'main.js'
            },
            module: {
                rules: [{
                    test: /\.m?js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', {
                                    targets: "defaults"
                                }]
                            ]
                        }
                    }
                }]
            }
        }))
        .pipe(sourcemaps.init())
        .pipe(uglify().on('error', notify.onError()))
        .pipe(sourcemaps.write('.'))
        .pipe(dest('./app/js'))
        .pipe(browserSync.stream())
}


// browser-sync
const watchFiles = () => {
    browserSync.init({
        server: {
            baseDir: "./app"
        }
    });

    watch('./src/scss/**/*.scss', styles);
    watch('./src/index.html', htmlInclude);
    watch('./src/img/**.jpg', imgToApp);
    watch('./src/img/**.png', imgToApp);
    watch('./src/img/**.jpeg', imgToApp);
    watch('./src/img/**.svg', svgSprites);
    watch('./src/resources/**', resources);
    watch('./src/fonts/**.ttf', fonts);
    watch('./src/js/**/*.js', scripts);
}


// tasks
exports.styles = styles;
exports.watchFiles = watchFiles;
exports.fileinclude = htmlInclude;

// start assembly
exports.default = series(clean, parallel(htmlInclude, scripts, fonts, resources, imgToApp, svgSprites), styles, watchFiles);



// BUILD

// compress
const tinypng = () => {
    return src(['./src/img/**.jpg', './src/img/**.png', './src/img/**.jpeg'])
        .pipe(tiny({
            key: 'LZQqrGgVXzdQRdPYJMKhv6R5hs6kQMr2',
            log: true
        }))
        .pipe(dest('./app/img'))
}


// sass to css
const stylesBuild = () => {
    return src('./src/scss/**/*.scss')
        .pipe(sass({
            outputStyle: 'expanded'
        }).on('error', notify.onError()))
        .pipe(rename({
            suffix: '.min'
        }))
        .pipe(autoPrefixer({
            cascade: false
        }))
        .pipe(cleanCSS({
            level: 2
        }))
        .pipe(dest('./app/css/'))
}


// scripts
const scriptsBuild = () => {
    return src('./src/js/main.js')
        .pipe(webpackStream({
            mode: 'development',
            output: {
                filename: 'main.js',
            },
            module: {
                rules: [{
                    test: /\.m?js$/,
                    exclude: /(node_modules|bower_components)/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: ['@babel/preset-env']
                        }
                    }
                }]
            },
        }))
        .on('error', function (err) {
            console.error('WEBPACK ERROR', err);
            this.emit('end'); // Don't stop the rest of the task
        })
        .pipe(uglify().on("error", notify.onError()))
        .pipe(dest('./app/js'))
}


// start build
exports.build = series(clean, parallel(htmlInclude, scriptsBuild, fonts, resources, imgToApp, svgSprites), stylesBuild, tinypng);



// DEPLOY
const deploy = () => {
    let conn = ftp.create({
        host: '',
        user: '',
        password: '',
        parallel: 10,
        log: gutil.log
    });

    let globs = [
        'app/**',
    ];

    return src(globs, {
            base: './app',
            buffer: false
        })
        .pipe(conn.newer('')) // only upload newer files
        .pipe(conn.dest(''));
}

// task deploy
exports.deploy = deploy;