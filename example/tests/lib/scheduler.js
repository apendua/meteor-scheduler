var connect = require('connect');
var http = require('http');
var later = require('later');
var moment = require('moment');
var _ = require('underscore');
var middleware = require('./middleware');
var crypto = require('crypto');
var PriorityQueue = require('priorityqueuejs');
var urlTools = require('url');

// API IMPLEMENTATION

function post(url, data, callback) {
  "use strict";
  var done = false;
  var postData = data !== undefined ? JSON.stringify(data) : '';
  var options = urlTools.parse(url);
  var request = http.request(_.extend(options, {
    method  : 'POST',
    headers : {
      'Content-Type'   : 'application/x-www-form-urlencoded',
      'Content-Length' : postData.length
    }
  }), function () {
    done = true;
    callback.apply(this, arguments);
  });
  request.write(postData);
  request.end();
  return request;
}

var Scheduler = function () {
  "use strict";
  var interval = 5 * 1000;
  var self = this;
  
  // in memory database
  var eventsById  = {};
  var eventsQueue = new PriorityQueue(function (e1, e2) {
    return e2.next.getTime() - e1.next.getTime();
  });

  self.addEvent = function (event) {
    //TODO: also handle cron jobs
    event.id      = crypto.randomBytes(8).toString('hex');
    event.inQueue = { id: event.id, next: event.when };
    eventsQueue.enq(event.inQueue);
    eventsById[event.id] = event;
    //-------------------------------
    // TODO: only tick a single event
    if (event.when - moment.valueOf() < interval) {
      self.tick();
    }
    //-----------
    return event;
  };
  
  self.tick = function () {
    var limit = moment().add('milliseconds', interval).toDate();
    var queue = null;
    
    while (eventsQueue.size() && eventsQueue.peek().next < limit) {
      queue = eventsQueue.deq();
      if (!queue.skip) {
        setTimeout(function () {
          var event = eventsById[queue.id];
          if (event && !queue.skip) {
            post(event.url, event.data, function (res) {
              console.log('GOT RESPONSE', res.statusCode);
              /*if (job.cron) {
                Jobs.update(job._id, { $set: {
                  when: later.schedule(later.parse.cron(job.cron)).next()
                }});
              } else {
                Jobs.update(job._id, { $set: {
                  status: res.statusCode
                }});
              }
              if (err) {
                // TODO: decrease the retries number
                console.log('JOB FAILDED:', job.url);
              }*/
            }).on('error', function (err) {
              //TODO: decide what we want to do with this
              //console.log('GOT AN ERROR', err);
            });
          }
        }, moment(queue.next).valueOf() - moment().valueOf());
      }
    }
  };
  
  self.api = function () {
    return [
      {
        regExp    : /^\/test$/,
        methods   : ['GET'],
        authorize : false
      },

      {
        regExp    : /^\/auth$/,
        methods   : ['GET', 'POST'],
        authorize : true
      },

      {
        regExp    : /^\/events\/when\/([^\/]+)\/([^\/]+)/,
        methods   : ['POST'],
        authorize : false,
        action    : function (req, res) {
          if (req.method === 'POST') {
            return self.addEvent({
              when : moment(this.params[0]).toDate(),
              url  : this.params[1]
            });
          }
        }
      }
    ];
  };
  
  var handle = null;
  
  self.start = function () {
    (function tick() {
      self.tick();
      handle = setTimeout(tick,  interval);
    }());    
  }
  
  self.stop = function () {
    handle && clearTimeout(handle);
  };
  
};


/*function getNextTick(cron) {
  //XXX I don't like this
  "use strict";
  var s = later.parse.cron(cron);
  var t = later.schedule(s).next();
  if (!isNaN(t.getTime())) {
    return t;
  }
}

this.route('test', {
  path   : '/v1/test',
  where  : 'server',
  action : function () {
    end(this, 200, []);
  }
});

this.route('auth', {
  path   : '/v1/auth',
  where  : 'server',
  action : authorize(function () {
    end(this, 200, []);
  })
});

this.route('listOfEvents', {
  path   : '/v1/events',
  where  : 'server',
  action : function () {
    end(this, 200,
        _.pluck(Jobs.find({ status: 'Active' }, { fields: { _id: 1 }}).fetch(), '_id')
      );
  }
});

this.route('eventDetails', {
  path   : '/v1/events/:id',
  where  : 'server',
  action : function () {
    var job = null;
    if (this.request.method === 'POST') {
      badRequest(this);
    } else {
      job = Jobs.findOne(this.params.id);
      if (!job) {
        end(this, 404);
      } else {
        if (this.request.method === 'GET') {
          // TODO: filter attributes
          end(this, 200, job);
        } else if (this.request.method === 'PUT') {
          // TODO: finish this one
          Jobs.update(this.params.id, { $set: {} });
        } else if (this.request.method === 'DELETE') {
          Jobs.remove(this.params.id);
        }
      }
    }
  }
});

this.route('addEvent', {
  path   : '/v1/events/when/:dateOrCron/:url',
  where  : 'server',
  action : verifyMethod('POST', function () {
    var next = getNextTick(this.params.dateOrCron);
    var job = {
      url    : this.params.url,
      status : 'Active'
    };
    if (this.request.body) {
      job.data = this.request.body;
    }
    if (next !== undefined) {
      // XXX this is probably a valid cron
      job.cron = this.params.dateOrCron;
      job.when = next;
    } else {
      // XXX not a valid cron, so probably date
      job.when = moment(this.params.dateOrCron).toDate();
    }

    end(this, 200, _.extend(job, {
      id: Jobs.insert(job)
    }));

    if (moment(job.when).diff() < Server.interval) {
      // XXX schedule this particular job
      Server.tick({ _id: job.id });
    }
  })
});
*/


module.exports = function (port) {
  "use strict";
  
  var scheduler = new Scheduler();
  
  var app = connect()
    .use(connect.query())
    .use(connect.urlencoded())
    .use(connect.json())
    .use(middleware.matchApi('/v1', scheduler.api(), { verbose: false }))
    .use(middleware.basicAuth())
    .use(middleware.apiCall());
  
  var server = http.createServer(app).listen(port);
  var connections = [];
  
  console.log('=> Scheduler running at: http://localhost:' + port + '/v1');
  
  server.on('close', function () {
    console.log('');
  });
  
  process.on('SIGINT', function () {
    server.close();
    scheduler.stop();
  });
  
  scheduler.start();
  
  return server;
};
