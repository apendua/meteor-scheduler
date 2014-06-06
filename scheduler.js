Scheduler = {};
Config = {};

// TODO: implement promises

(function (Scheduler, Config) {
  "use strict";
  
  var Future = Npm.require('fibers/future');
  
  Config.jobsByName = {};
  Config.options = {};
  Config.validators = {
    allow : [],
    deny  : []
  };

  function careAboutArguments(func) {
    return function () {
      var args = _.toArray(arguments);
      if (typeof _.last(args) === 'function') {
        while (args.length < func.length) {
          args.splice(args.length - 1, 0, undefined);
        }
      }
      return func.apply(this, args);
    };
  }
  
  function getJobUrl(name) {
    return Meteor.absoluteUrl(Config.options.jobsPrefix + '/' + name);
  }
  
  function getApiUrl(path, options) {
    if (!Config.options.schedulerUrl) {
      throw new Meteor.Error(500, 'SCHEDULER_URL is not defined');
    }
    return Config.options.schedulerUrl + path.replace(/:\w+/g, function (attrName) {
      return encodeURIComponent(options[attrName.substr(1)]);
    });
  }
  
  function wrap(callback) {
    if (callback) {
      return function (err, res) {
        if (res) {
          res = res.data;
        }
        callback(err, res);
      };
    }
  }
  
  Scheduler.allow = function (validator) {
    // TODO: throw an error if validatro is not a function
    if (_.isFunction(validator)) {
      Config.validators.allow.push(validator);
    }
  };
  
  // TODO: check the existance of insecure package
  Scheduler.validate = function (userId, args) {
    return _.some(Config.validators.allow, function (validator) {
      return validator.apply(null, [userId].concat(args));
    });
  };

  Scheduler.isValidCron = (function () {
    // TODO: these guys may be a little too restrictive
    var regExes = [
      /^(\d{1,2}|\*)(\/\d{1,2})?$/,
      /^(\d{1,2})(\,\d{1,2})*$/,
      /^\d{1,2}-\d{1,2}$/
    ];
    return function (cron) {
      // this is only to tell the difference between iso date and cron string so the tests are realy naive
      cron = cron.split(' ');
      if (cron.length !== 6) {
        return false;
      }
      return _.every(cron, function (field) {
        return _.some(function (re) {
          return re.test()
        })
      });
    }
  }());
  
  // TODO: allow defining the auth string explicitlly
  Scheduler.configure = function (options) {
    _.extend(Config.options, options);
    Config.jobsRegExp = new RegExp('^\/' + Config.options.jobsPrefix + '(\/\\w+)?');
    //------------------------------------------------------------------------------
    if (_.has(options, 'schedulerUrl') && !_.has(options, 'auth')) {
      // TODO: use url.parse
      var match = /\/\/(\w+:\w+)@/.exec(Config.options.schedulerUrl);
      if (match) {
        Config.options.auth = match[1];
      }
    }
  };
  
  // set the default options
  Scheduler.configure({
    schedulerUrl : Meteor.absoluteUrl('v1'),
    jobsPrefix   : 'jobs'
  });
  
  Scheduler.job = function (name, callback) {
    // TODO: error when a job already exists
    Config.jobsByName[name] = callback;
  };

  Scheduler.ping = function (callback) {
    return HTTP.get(getApiUrl('/test'), wrap(callback));
  };

  Scheduler.checkAuth = function (callback) {
    return HTTP.post(getApiUrl('/auth'), {
      auth : Config.options.auth
    }, wrap(callback));
  };

  Scheduler.getIdsOfAllEvents = function (callback) {
    return HTTP.get(getApiUrl('/events'), {
      auth : Config.options.auth
    }, wrap(callback));
  };
  
  Scheduler.addEvent = careAboutArguments(function (name, when, data, callback) {
    if (!Scheduler.isValidCron(when)) {
      when = moment(when);
      if (!when.isValid()) {
        throw new Meteor.Error(400, 'Wrong time format. Expecting either cron expression or iso8601 date.');
      } else {
        when = when.toISOString();
      }
    }
    return HTTP.post(getApiUrl('/events/when/:dateOrCron/:url', {
      auth       : Config.options.auth,
      url        : getJobUrl(name),
      dateOrCron : moment(when).toISOString()
    }), { data: data }, wrap(callback));
  });

  Scheduler.getEvent = careAboutArguments(function (eventId, callback) {
    return HTTP.get(getApiUrl('/events/:id', {
      auth : Config.options.auth,
      id   : eventId
    }), wrap(callback));
  });
  
  Scheduler.cancelEvent = careAboutArguments(function (eventId, callback) {
    return HTTP.del(getApiUrl('/events/:id', {
      auth : Config.options.auth,
      id   : eventId
    }), wrap(callback));
  });
  
  Scheduler.updateEvent = careAboutArguments(function (eventId, updates, callback) {
    updates = updates || {};
    return HTTP.put(getApiUrl('/events/:id', {
      auth : Config.options.auth,
      id   : eventId
    }), { data : updates }, wrap(callback));

  });
  
  function proxy(method) {
    // TODO: try to implement this without future
    return function () {
      if (!Scheduler.validate(this.userId, _.toArray(arguments))) {
        throw new Meteor.Error(403, 'Access denied.');
      }
      
      var future = new Future();
      var args   = _.toArray(arguments);
      
      this.unblock();
      
      args.push(function (err, res) {
        if (err) {
          if (err.response) {
            future['throw'](new Meteor.Error(err.response.statusCode, (res && res.message) || 'failed'));
          } else {
            future['throw'](new Meteor.Error(500, 'Cannot establish connection.'));
          }
        } else {
          future['return'](res);
        }
      });
      method.apply(this, args);
      return future.wait();
    };
  }

  var methods = {};

  _.each(['ping', 'checkAuth', 'addEvent', 'getEvent', 'cancelEvent', 'updateEvent', 'listAllEvents'], function (name) {
    methods['scheduler/' + name] = proxy(Scheduler[name]);
  });

  Meteor.methods(methods);
  
}(Scheduler, Config));
