Scheduler = {};
Config = {};

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
      if (res !== undefined) {
        res = res.data;
      }
      callback(err, res);
    };
  }
  
  Scheduler.allow = function (validator) {
    // TODO: throw an erro if not
    if (_.isFunction(validator)) {
      Config.validators.allow.push(validator);
    }
  };
  
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
        throw new Meteor.Error(403, 'Acess denied.');
      }
      var future = new Future();
      var args   = _.toArray(arguments);
      this.unblock();
      args.push(function (err, res) {
        if (err) {
          throw err;
        } else {
          future['return'](res);
        }
      });
      method.apply(this, args);
      return future.wait();
    };
  }

  var methods = {};

  _.each(['addEvent', 'getEvent', 'cancelEvent', 'updateEvent', 'listAllEvents'], function (name) {
    methods['scheduler/' + name] = proxy(Scheduler[name]);
  });

  Meteor.methods(methods);
  
}(Scheduler, Config));
