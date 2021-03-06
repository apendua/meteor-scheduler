(function () {
  "use strict";

  var connect = Npm.require('connect');
  var Fiber = Npm.require('fibers');
  var connectHandlers = WebApp.connectHandlers;

  var forbidden = function (res) {
    res.statusCode = 403;
    res.setHeader("Content-Type", "application/json; character=utf-8");
    res.end(JSON.stringify({
      error   : 403,
      reason  : "access denied",
      details : "..."
    }));
  };

  // TODO: create an API package
  // TODO: add basic authentication
  
  connectHandlers
    .use(connect.query())
    .use(connect.bodyParser())
    .use(function (req, res, next) {
      var match = Config.jobsRegExp.exec(req._parsedUrl.path);
      var name = "";
      
      function end(code, data) {
        res.statusCode = code;
        if (_.isObject(data)) {
          res.setHeader("Content-Type", "application/json; character=utf-8");
          res.end(JSON.stringify(data));
        }
        res.end();
      }
      
      if (!match) {
        next();
      } else {
        name = match[1];
        if (name === undefined) {
          end(200, _.map(_.keys(Config.jobsByName), function (name) {
            return Meteor.absoluteUrl(Config.options.jobsPrefix + '/' + name);
          }));
        } else {
          name = name.substr(1);
          // TODO: use bindEnvironment instead of Fiber
          Fiber(function () {
            var json = null;
            try {
              if (!_.isFunction(Config.jobsByName[name])) {
                throw new Meteor.Error(404, 'Job not found.');
              }
              json = Config.jobsByName[name](req.body || {});
              if (_.isString(json) || _.isNumber(json)) {
                json = { message: json };
              }
              // always end the request, no matter what
              end(200, json);
            } catch (err) {
              end(err.error || 500, {
                error   : err.error || 500,
                message : err.toString()
              });
            }
          }).run();
          
        }
      }
    });
  
}());
