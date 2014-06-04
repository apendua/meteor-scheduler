// response helpers

function end(res, code, data) {
  "use strict";
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; character=utf-8");
  res.end(JSON.stringify(data));
}

function forbidden(res) {
  "use strict";
  end(res, 403, { error: 403, message: 'Access denied.' });
}

function credentials(res) {
  "use strict";
  res.setHeader('WWW-Authenticate', 'Basic realm="Scheduler"');
  end(res, 401, { error : 401, message : 'Authorization required.' });
}

// middleware

function matchApi(prefix, api, options) {
  "use strict";
  options = options || {};
  function log() {
    if (options.verbose) {
      console.log.apply(console, arguments);
    }
  }
  return function (req, res, next) {
    var path = req._parsedUrl.path;
    var config, match;
    if (path.search(prefix) !== 0) {
      next();
    } else {
      log('=>', 'api request:', path);
      path = path.substr(prefix.length);
      // find matching api action
      api.some(function (_config) {
        config = _config;
        match  = _config.regExp.exec(path);
        return !!match;
      });
      if (match) {
        log('=>', 'found match', JSON.stringify(match, undefined, 2));
        // we've found matching action, good ...
        if (!config.methods || config.methods.indexOf(req.method) >= 0) {
          req.api = {
            authorize : !!config.authorize,
            action    : function (req, res) {
              // proxy the original action
              if (typeof config.action === 'function') {
                return config.action.apply({
                  params: match.slice(1).map(decodeURIComponent) // XXX match[0] is useless
                }, arguments);
              }
              return []; // XXX return anything
            }
          };
        }
        next();
      } else {
        end(res, 400, { error: 400, message: "Not implemented." });
      }
    }
  };
}

function basicAuth(validate) {
  "use strict";
  return function (req, res, next) {
    var auth = req.headers.authorization;
    var match;

    if (req.api && !req.api.authorize) {
      next();
    } else {
      if (!auth) {
        credentials(res);
      } else {
        match = /Basic\s+([\w\d]+)/.exec(auth);
        if (!match) {
          credentials(res);
        } else {
          auth = (new Buffer(match[1], 'base64')).toString().split(':');
          if (typeof validate === 'function' && validate(auth[0], auth[1])) {
            forbidden(res);
          } else {
            next();
          }
          //if (Meteor.users.find({ appKey: auth[0], appSecret: auth[1] }).count() == 0) {
          //  end(this, 403, { error: 403, message: 'Access denied.' });
          //}
        }
      }
    }
  };
}

function apiCall() {
  "use strict";
  return function (req, res, next) {
    var json;
    if (req.api) {
      try {
        json = req.api.action(req, res);
        if (json !== undefined) {
          end(res, 200, json);
        }
      } catch (err) {
        // TODO: maybe something more descriptive?
        end(res, 400, 'failed');
        throw err; // XXX make sure the error is properly displayed
      }
    } else {
      next();
    }
  };
}

// exports

if (typeof exports !== 'undefined') {
  exports.matchApi  = matchApi;
  exports.basicAuth = basicAuth;
  exports.apiCall   = apiCall;
}
