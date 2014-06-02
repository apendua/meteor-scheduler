(function () {
  "use strict";
  
  Config = {};
  
  Config.jobsByName = {};
  Config.options = {};
  
  Scheduler = {};
  
  function getJobUrl(name) {
    return Meteor.absoluteUrl(Config.options.jobsPrefix + '/' + name);
  }
  
  function getApiUrl(path, options) {
    return Config.options.schedulerUrl + path.replace(/:\w+/g, function (attrName) {
      return encodeURIComponent(options[attrName.substr(1)]);
    });
  }

  Scheduler.configure = function (options) {
    _.extend(Config.options, options);
    Config.jobsRegExp = new RegExp(Config.options.jobsPrefix + '(\\w+)');
  };
  
  // set the default options
  Scheduler.configure({
    schedulerUrl : Meteor.absoluteUrl('/v1'),
    jobsPrefix   : '/jobs/'
  });
  
  Scheduler.job = function (name, callback) {
    // TODO: error when a job already exists
    Config.jobsByName[name] = callback;
  };

  Scheduler.addEvent = function (name, when, data, callback) {
    HTTP.post(getApiUrl('/events/when/:dateOrCron/:url', {
      url        : getJobUrl(name),
      dateOrCron : when
    }), { data: data }, callback);
  };

  Scheduler.getEvent = function (eventId, callback) {
    HTTP.get(getApiUrl('/events/:id', {
      id : eventId
    }), callback);
  };
  
  Scheduler.cancelEvent = function (eventId, callback) {
    HTTP.del(getApiUrl('/events/:id', {
      id : eventId
    }), callback);
  };
  
  Scheduler.updateEvent = function (eventId, when, data, callback) {
    var updates = {};
    
    HTTP.put(getApiUrl('/events/:id', {
      id : eventId
    }), { data : updates }, callback);

  };
  
  Scheduler.listAllEvents = function (callback) {
    HTTP.get(getApiUrl('/events'), callback);
  };
  
}());
