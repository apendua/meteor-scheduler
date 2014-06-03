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
  
  function getJobUrl(name) {
    return Meteor.absoluteUrl(Config.options.jobsPrefix + '/' + name);
  }
  
  function getApiUrl(path, options) {
    return Config.options.schedulerUrl + path.replace(/:\w+/g, function (attrName) {
      return encodeURIComponent(options[attrName.substr(1)]);
    });
  }
  
  function wrap(callback) {
    return function (err, res) {
      if (res) {
        res = res.data;
      }
      if (_.isFunction(callback)) {
        callback(err, res);
      }
    };
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
  
  Scheduler.configure = function (options) {
    _.extend(Config.options, options);
    Config.jobsRegExp = new RegExp('^\/' + Config.options.jobsPrefix + '(\/\\w+)?');
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
    HTTP.get(getApiUrl('/test'), wrap(callback));
  };

  Scheduler.checkAuth = function (callback) {
    HTTP.post(getApiUrl('/auth'), wrap(callback));
  };
  
  Scheduler.addEvent = function (name, when, data, callback) {
    HTTP.post(getApiUrl('/events/when/:dateOrCron/:url', {
      url        : getJobUrl(name),
      dateOrCron : when
    }), { data: data }, wrap(callback));
  };

  Scheduler.getEvent = function (eventId, callback) {
    HTTP.get(getApiUrl('/events/:id', {
      id : eventId
    }), wrap(callback));
  };
  
  Scheduler.cancelEvent = function (eventId, callback) {
    HTTP.del(getApiUrl('/events/:id', {
      id : eventId
    }), wrap(callback));
  };
  
  Scheduler.updateEvent = function (eventId, when, data, callback) {
    var updates = {};
    
    HTTP.put(getApiUrl('/events/:id', {
      id : eventId
    }), { data : updates }, wrap(callback));

  };
  
  Scheduler.listAllEvents = function (callback) {
    HTTP.get(getApiUrl('/events'), wrap(callback));
  };
  
  function proxy(method) {
    return function () {
      if (!Scheduler.validate(this.userId, _.toArray(arguments))) {
        throw new Meteor.Error(403, 'Access denied.');
      }
      var future = new Future();
      var args   = _.toArray(arguments);
      this.unblock();
      args.push(function (err, res) {
        if (err) {
          future['throw'](new Meteor.Error(res.error, res.message));
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
