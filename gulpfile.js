/**
 * Settings
 * Turn on/off build features
 */

var settings = {
  clean: true,
  scripts: true,
  componentScripts: true,
  polyfills: false,
  styles: true,
  templates: true,
  svgs: true,
  assets: true,
  reload: true,
};

/**
 * Paths to project folders
 */

var paths = {
  input: "src/",
  output: "dist/",
  scripts: {
    input: "src/js/*",
    polyfills: ".polyfill.js",
    components: "src/components/**/*.js",
    output: "dist/js/",
  },
  styles: {
    input: "src/sass/**/*.{scss,sass}",
    output: "dist/css/",
  },
  templates: {
    pages: "src/templates/pages/**/*.twig",
    data: "src/data/**/*.json",
  },
  assets: {
    input: "src/assets/**!(svg)/*", // Excl. the assets/svg folder
    output: "dist/assets/",
  },
  svgs: {
    input: "src/assets/svg/*.svg",
    output: "dist/assets/svg/",
  },
  reload: "./dist/",
};

/**
 * Template for banner to add to file headers
 */

var banner = {
  full:
    "/*!\n" +
    " * <%= package.name %> v<%= package.version %>\n" +
    " * <%= package.description %>\n" +
    " * (c) " +
    new Date().getFullYear() +
    " <%= package.author.name %>\n" +
    " * <%= package.license %> License\n" +
    " * <%= package.repository.url %>\n" +
    " */\n\n",
  min:
    "/*!" +
    " <%= package.name %> v<%= package.version %>" +
    " | (c) " +
    new Date().getFullYear() +
    " <%= package.author.name %>" +
    " | <%= package.license %> License" +
    " | <%= package.repository.url %>" +
    " */\n",
};

/**
 * Gulp Packages
 */

// General
var { gulp, src, dest, watch, series, parallel } = require("gulp");

var del = require("del"),
  flatmap = require("gulp-flatmap"),
  lazypipe = require("lazypipe"),
  rename = require("gulp-rename"),
  header = require("gulp-header"),
  package = require("./package.json");

// Scripts
var jshint = require("gulp-jshint"),
  stylish = require("jshint-stylish"),
  concat = require("gulp-concat"),
  uglify = require("gulp-terser"),
  optimizejs = require("gulp-optimize-js");

// Styles
var sass = require("gulp-sass"),
  sassGlob = require("gulp-sass-glob"),
  sourcemaps = require("gulp-sourcemaps"),
  prefix = require("gulp-autoprefixer"),
  minify = require("gulp-cssnano");

// Templates
var twig = require("gulp-twig"),
  path = require("path"),
  data = require("gulp-data");

var fs = require("fs");

// SVGs
var svgmin = require("gulp-svgmin");

// BrowserSync
var browserSync = require("browser-sync");

// Custom functions
function requireUncached(dataFile) {
  try {
    delete require.cache[require.resolve(dataFile)];
    return require(dataFile);
  } catch (error) {
    console.error(error.message);
  }
}

/**
 * Gulp Tasks
 */

// Remove pre-existing content from output folders
var cleanDist = function (done) {
  // Make sure this feature is activated before running
  if (!settings.clean) return done();

  // Clean the dist folder
  del.sync([paths.output]);

  // Signal completion
  return done();
};

// Repeated JavaScript tasks
var jsTasks = lazypipe()
  .pipe(header, banner.full, { package: package })
  .pipe(optimizejs)
  //.pipe(dest, paths.scripts.output)
  //.pipe(rename, {suffix: '.min'})
  .pipe(uglify)
  .pipe(optimizejs)
  .pipe(header, banner.min, { package: package })
  .pipe(dest, paths.scripts.output);

// Lint, minify, and concatenate scripts
var buildScripts = function (done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Run tasks on script files
  return src(paths.scripts.input).pipe(
    flatmap(function (stream, file) {
      // If the file is a directory
      if (file.isDirectory()) {
        // Setup a suffix variable
        var suffix = "";

        // If separate polyfill files enabled
        if (settings.polyfills) {
          // Update the suffix
          suffix = ".polyfills";

          // Grab files that aren't polyfills, concatenate them, and process them
          src([
            file.path + "/*.js",
            "!" + file.path + "/*" + paths.scripts.polyfills,
          ])
            .pipe(concat(file.relative + ".js"))
            .pipe(jsTasks());
        }

        // Grab all files and concatenate them
        // If separate polyfills enabled, this will have .polyfills in the filename
        src(file.path + "/*.js")
          .pipe(concat(file.relative + suffix + ".js"))
          .pipe(jsTasks());

        return stream;
      }

      // Otherwise, process the file
      return stream.pipe(jsTasks());
    })
  );
};

// Concat JS in components
var concatComponentScripts = function (done) {
  if (!settings.componentScripts) return done();

  // Run tasks on JS files in components folders
  return src(paths.scripts.components)
    .pipe(sourcemaps.init())
    .pipe(concat("components.js"))
    .pipe(sourcemaps.write("."))
    .pipe(dest(paths.scripts.output));
};

// Lint scripts
var lintScripts = function (done) {
  // Make sure this feature is activated before running
  if (!settings.scripts) return done();

  // Lint scripts
  return src([paths.scripts.input, paths.scripts.components])
    .pipe(jshint())
    .pipe(jshint.reporter("jshint-stylish"));
};

// Process, lint, and minify Sass files
var buildStyles = function (done) {
  // Make sure this feature is activated before running
  if (!settings.styles) return done();

  // Run tasks on all Sass files
  return (
    src(paths.styles.input)
      .pipe(sourcemaps.init())
      .pipe(sassGlob())
      .pipe(
        sass({
          includePaths: require("node-normalize-scss").includePaths,
          outputStyle: "expanded",
          sourceComments: true,
          errLogToConsole: true,
        })
      )
      .pipe(
        prefix({
          cascade: true,
          remove: true,
        })
      )
      .pipe(header(banner.full, { package: package }))
      //.pipe(sourcemaps.write('./maps'))
      //.pipe(dest(paths.styles.output))
      //.pipe(rename({suffix: '.min'}))
      .pipe(
        minify({
          discardComments: {
            removeAll: true,
          },
        })
      )
      .pipe(header(banner.min, { package: package }))
      .pipe(sourcemaps.write("."))
      .pipe(dest(paths.styles.output))
  );
};

// Generate html from templates and data
var buildTemplates = function (done) {
  if (!settings.templates) return done();

  return (
    src(paths.templates.pages)
      .pipe(
        data(function (file) {
          var dataPath =
            "./src/data/" + path.basename(file.path, ".twig") + ".json";
          return requireUncached(dataPath);
          //return require('./src/data/' + path.basename(file.path, '.twig') + '.json');
        })
      )
      .pipe(
        twig({
          errorLogToConsole: true,
          //debug: true
        })
      )
      //.pipe(prettify({indent_char: ' ', indent_size: 2}))
      .pipe(dest(paths.output))
  );
};

// Optimize SVG files
var buildSVGs = function (done) {
  // Make sure this feature is activated before running
  if (!settings.svgs) return done();

  // Optimize SVG files
  return src(paths.svgs.input).pipe(svgmin()).pipe(dest(paths.svgs.output));
};

// Copy asset files into output folder
var copyAssets = function (done) {
  // Make sure this feature is activated before running
  if (!settings.assets) return done();

  // Copy static files
  return src(paths.assets.input).pipe(dest(paths.assets.output));
};

// Watch for changes to the entire src directory
var startServer = function (done) {
  // Make sure this feature is activated before running
  if (!settings.reload) return done();

  // Initialize BrowserSync
  browserSync.init({
    browser: "chrome",
    server: {
      baseDir: paths.reload,
    },
  });

  // Signal completion
  done();
};

// Reload the browser when files change
var reloadBrowser = function (done) {
  if (!settings.reload) return done();
  browserSync.reload();
  done();
};

// Watch for changes
var watchSource = function (done) {
  watch(paths.input, series(exports.default, reloadBrowser));
  done();
};

/**
 * Export Tasks
 */

// Default task
exports.default = series(
  cleanDist,
  parallel(
    buildScripts,
    concatComponentScripts,
    lintScripts,
    buildStyles,
    buildTemplates,
    buildSVGs,
    copyAssets
  )
);

// Watch and reload
exports.watch = series(exports.default, startServer, watchSource);
