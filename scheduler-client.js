(function () {
  "use strict";

  Scheduler = {};

  _.each(['addEvent', 'getEvent', 'cancelEvent', 'updateEvent', 'listAllEvents'], function (name) {
    Scheduler[name] = function () {
      var args = _.toArray(arguments);
      var callback = _.last(args);
      if (_.isFunction(callback)) {
        Meteor.apply('scheduler/' + name, _.initial(args), callback);
      } else {
        Meteor.apply('scheduler/' + name, args);
      }
    };
  });
  
}());
