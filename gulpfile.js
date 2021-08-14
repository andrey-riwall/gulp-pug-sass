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
const pug = require('gulp-pug');
const pugLinter = require('gulp-pug-linter');
const rev = require('gulp-rev');
const revRewrite = require('gulp-rev-rewrite');
const revdel = require('gulp-rev-delete-original');



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
    return src('./src/img/**/**.svg')
        .pipe(svgSprite({
            mode: {
                stack: {
                    sprite: '../sprite.svg'
                }
            }
        }))
        .pipe(dest('./app/img'))
}


// pug to html
const layout = () => {
    return src('./src///*.pug')
    .pipe(pug({
        pretty: true
    }).on('error', notify.onError()))
    .pipe(dest('./app/'))
    .pipe(browserSync.stream())
}

const layoutLinter = () => {
    return src('./src/**/**/*.pug')
        .pipe(pugLinter({ failAfterError: true }))
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


// dest img
const imgToApp = () => {
    return src(['./src/img/**/**.jpg', './src/img/**/**.png', './src/img/**/**.jpeg'])
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
    return src('./src/js/**/**.js')
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

    watch('./src/**/**/*.pug', layout);
    watch('./src/scss/**/*.scss', styles);
    watch('./src/img/**/**.jpg', imgToApp);
    watch('./src/img/**/**.png', imgToApp);
    watch('./src/img/**/**.jpeg', imgToApp);
    watch('./src/img/**/**.svg', svgSprites);
    watch('./src/resources/**', resources);
    watch('./src/fonts/**.ttf', fonts);
    watch('./src/js/**/*.js', scripts);
}


// tasks
exports.layout = layout;
exports.styles = styles;
exports.watchFiles = watchFiles;

// start assembly
exports.default = series(clean, parallel(layout, layoutLinter, scripts, fonts, resources, imgToApp, svgSprites), styles, watchFiles);



// BUILD

// compress
const tinypng = () => {
    return src(['./src/img/**/**.jpg', './src/img/**/**.png', './src/img/**/**.jpeg'])
        .pipe(tiny({
            key: 'LZQqrGgVXzdQRdPYJMKhv6R5hs6kQMr2',
            log: true
        }))
        .pipe(dest('./app/img'))
}


// pug to html
const layoutBuild = () => {
    return src('./src///*.pug')
    .pipe(pug({
        pretty: false
    }).on('error', notify.onError()))
    .pipe(dest('./app/'))
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
    return src('./src/js/**/**.js')
        .pipe(uglify().on('error', notify.onError()))
        .pipe(dest('./app/js'))
}



// start build
exports.build = series(clean, parallel(layoutBuild, scriptsBuild, fonts, resources, imgToApp, svgSprites), stylesBuild, tinypng);



// CACHE

// cache
const cache = () => {
    return src('app/**/*.{css,js,svg,png,jpg,jpeg,woff2,woff}', {
        base: 'app'
    })
        .pipe(rev())
        .pipe(revdel())
        .pipe(dest('app'))
        .pipe(rev.manifest('rev.json'))
        .pipe(dest('app'))
}


// rewrite
const rewrite = () => {
    const manifest = src('app/rev.json')

    return src('app/**/*.html')
        .pipe(revRewrite({
            manifest
        }))
        .pipe(dest('app'))
}

// start cache
exports.cache = series(cache, rewrite);



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