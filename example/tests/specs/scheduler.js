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
        Scheduler.job('testJob', function () {
          emit('testJob');
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
    
    it('should not be able to pass the authentication test.', function (done) {    
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
    
    it('should be able to trigger an existing job.', function (done) {
      // TODO: test the time difference

      var timestamp = Date.now();

      promise(server)
        .eval(function () {
          Scheduler.addEvent('testJob', moment().add('seconds', 3).toISOString());
        })
        .once('testJob', function () {
          return Date.now() - timestamp;
        })
        .then(function (value) {
          expect(value).to.be.ok;
        })
        .always(done);
    });
  });
  

});
