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
      
      if (!match) {
        next();
      } else {
        // TODO: use bindEnvironment instead
        name = match[1];
        Fiber(function () {
          var json = {};
          try {
            json = Config.jobsByName[name](req, res);
            if (json) {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json; character=utf-8");
              res.end(JSON.stringify(json));
            }
            // if not, assuming that the callback will process the response manually             
          } catch (err) {
            res.statusCode = err.error || 500;
            res.setHeader("Content-Type", "application/json; character=utf-8");
            res.end(JSON.stringify({
              error   : res.statusCode,
              message : err.toString()
            }));
          }
        }).run();
      }
    });
  
}());
