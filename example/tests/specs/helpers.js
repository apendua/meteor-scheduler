/*global setup, before, describe, it, emit, eval*/

var expect = require('chai').expect;
var promise = require('../helpers').promise;
var throttle = require('../helpers').throttle;

describe('Helpers.', function () {
  "use strict";
  
  var server, client;
  
  setup(function (_server, _client) {
    server = _server;
    client = _client;
  });
  
  describe('Given a valid cron expression,', function () {

    it('should return "true".', function (done) {
      promise(client)
        .eval(function () {
          // TODO: implement more examples
          return [
            Scheduler.isValidCron('* * * * * *'),
            Scheduler.isValidCron('* * * * 1-4/2 *'),
            Scheduler.isValidCron('* */2 1-3 4 0 *'),
            Scheduler.isValidCron('1 2/2 4 * * *'),
            Scheduler.isValidCron('* */2 1-3 4 0 *')
          ];
        })
        .then(function (results) {
          expect(results).not.to.contain.false;
        })
        .always(done);
    });

  });

  describe('Given an invalid cron expression,', function () {

    it('should return "false".', function (done) {
      promise(client)
        .eval(function () {
          return [
            Scheduler.isValidCron('* */2 1-3 4 A *'),
            Scheduler.isValidCron('1 2/ 4 * * *'),
            Scheduler.isValidCron('* /2 1-3 4 0 *'),
            Scheduler.isValidCron('* * * * * * *'),
            Scheduler.isValidCron('253 /2 * - 0 *')
          ];
        })
        .then(function (results) {
          expect(results).not.to.contain.false;
        })
        .always(done);
    });

  });

});
