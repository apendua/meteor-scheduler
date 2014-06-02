(function () {
  "use strict";

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
  
  connectHandlers
    .use(function (req, res, next) {
      if (req.url === "/events") {
        console.log(req.headers);
      }
      next();
    })
    .use(function (req, res, next) {
      
      var match = Config.jobsRegExp.exec(req.url);
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
        // TODO: use bindEnvironment instead
        name = match[1];
        
        if (name === undefined) {
          
          end(200, _.map(_.keys(Config.jobsByName), function (name) {
            return Meteor.absoluteUrl(Config.options.jobsPrefix + '/' + name);
          }));
          
        } else {
      
          Fiber(function () {
            var json = null;
            try {
              if (!_.isFunction(Config.jobsByName[name] === undefined)) {
                throw new Meteor.Error(404, 'Job not found.');
              }
              json = Config.jobsByName[name](req, res);
              if (json) {
                // if not, we assume that the callback will process the response manually
                end(200, json);
              }
            } catch (err) {
              end(err.error || 500, {
                error   : res.statusCode,
                message : err.toString()
              });
            }
          }).run();
          
        }
      }
    });
  
}());
