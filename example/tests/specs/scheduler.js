var expect = require('chai').expect;
var promise = require('../helpers').promise;
var throttle = require('../helpers').throttle;

describe('Scheduler.', function () {
  var server, client;
  
  setup(function (_server, _client) {
    server = _server; client = _client;
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
