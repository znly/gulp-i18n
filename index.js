"use strict";

var Through = require("through2");
var MessageFormat = require("messageformat");
var Gutil = require("gulp-util");
var Yaml = require("js-yaml");
var Marked = require("marked");

module.exports = function (options) {
  var locales = {};

  var parse = function (file, encoding, next) {
    var relativeParts = file.relative.split("/");
    var ext = relativeParts[relativeParts.length - 1].split(".").pop();
    var message = {
      locale: relativeParts.shift(),
      namespace: relativeParts
        .join("/")
        .replace(/\.[^.]*$/, "")
        .replace(/\\/g, "/"),
      data: null
    };

    try {
      if (ext === "yml") {
        message.data = Yaml.safeLoad(file.contents.toString());
      } else {
        message.data = JSON.parse(file.contents.toString());
      }

      Object.keys(message.data || {}).forEach(function (key) {
        // Convert Markdown to HTML if string contains new line char.
        if (message.data[key] && message.data[key].indexOf("\n") >= 0) {
          message.data[key] = Marked(message.data[key].trim(), {
            breaks: true
          });
        }
      });
    } catch (err) {
      console.error(err);
    }

    locales[message.locale] = locales[message.locale] || {};
    locales[message.locale][message.namespace] = message.data;

    next();
  };

  var flush = function (cb) {
    Object.keys(locales).forEach(function (locale) {
      var mf = new MessageFormat(locale);
      var data = locales[locale];
      var compiled =
        "window.i18n = (function () { " + mf.compile(data) + " })();";
      return new Gutil.File({
        path: locale + ".js",
        contents: new Buffer(compiled)
      });
    });

    cb();
  };

  return Through.obj(parse, flush);
};
