/*global setup, before, describe, it, emit, eval*/

var expect = require('chai').expect;
var promise = require('../helpers').promise;
var throttle = require('../helpers').throttle;

describe('Scheduler.', function () {
  "use strict";
  
  var server, client;
  
  setup(function (_server, _client) {
    server = _server;
    client = _client;
  });
  
  before(function (done) {
    promise(server)
      .eval(function () {
        Scheduler.job('testJob', function (data) {
          emit('testJob', data.value);
        });
      })
      .always(done);
  });
  
  describe('Given not authorized access,', function () {

    it('should be able to ping the scheduling server.', function (done) {
      promise(client)
        .eval(function () {
          Scheduler.ping(function () {
            emit('pong');
          });
        })
        .once('pong', function () {
          done();
        });
    });

    it('should not be able to do anything else.', function (done) {
      // TODO: test all possible api calls
      promise(client)
        .evalAsync(function () {
          Scheduler.checkAuth(function (err, res) {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        })
        .then(function () {
          throw new Error('Error was not thrown.');
        }, function (err) {
          expect(err.toString()).to.contain('40'); // it may be either 401 or 403
        })
        .always(done);
    });
  });
  
  describe('Given an authorized access,', function () {
  
    before(function (done) {
      promise(server)
        .eval(function () {
          Scheduler.configure({
            auth: 'user:password'
          });
        })
        .always(done);
    });
    
    it('should be able to pass the authentication test.', function (done) {
      promise(client)
        .evalAsync(function () {
          Scheduler.checkAuth(function (err, res) {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        })
        .then(function (res) {
          expect(res).to.be.ok;
        })
        .always(done);
    });
    
    it('should be able to trigger an existing job with arguments.', function (done) {
      // TODO: test the time difference

      var timestamp = Date.now();

      promise(server)
        .eval(function () {
          Scheduler.addEvent('testJob', moment().add('seconds', 3).toISOString(), { value: 123 });
        })
        .once('testJob', function (value) {
          expect(value).to.eql(123);
          return Date.now() - timestamp;
        })
        .then(function (value) {
          expect(value).to.be.ok;
        })
        .always(done);
    });

    it('should throw an error when time is given in a wrong format.', function (done) {
      promise(server)
        .eval(function () {
          Scheduler.addEvent('testJob', '* * * * *'); // should have 6 fields
        })
        .expectError(function (err) {
          expect(err.toString()).to.contain('400');
        })
        .always(done);
    });
  });

  describe('Event API,', function () {

    var eventData;

    before(function (done) {
      promise(server)
        .evalAsync(function () {
          Scheduler.addEvent('testJob', moment().add('hours', 1).toISOString(), done);
        })
        .then(function (result) {
          eventData = result;
        })
        .always(done);
    });

    it('should be able to add a new event.', function () {
      expect(eventData.id).to.exist;
    });

    it('should be able to fetch event config.', function (done) {
      promise(server)
        .evalAsync(function (eventId) {
          Scheduler.getEvent(eventId, done);
        }, eventData.id)
        .then(function (result) {
          expect(result.id).to.eql(eventData.id);
          expect(result.url).to.eql(eventData.url);
          expect(result.when).to.eql(eventData.when);
        })
        .always(done);
    });

  });

});
