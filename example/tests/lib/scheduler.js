var connect = require('connect');
var http = require('http');
var later = require('later');
var moment = require('moment');
var _ = require('underscore');

var app = connect()
  .use(connect.query())
  .use(connect.urlencoded())
  .use(connect.json())
  .use(function (req, res, next) {
    next();
  })
  .use(function (req, res, next) {
    // authorization
    next();
  })
  .use(function(req, res, next){
    console.log(req._parsedUrl.path);
    res.end('hello world\n');
  });

module.exports = function (port) {
  return http.createServer(app).listen(port);
};

function end(res, code, data) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; character=utf-8");
  res.end(JSON.stringify(data));
}

function requireCredentials(res) {
  res.setHeader('WWW-Authenticate', 'Basic realm="Scheduler"');
  res.statusCode = 401;
  res.end();
}
  
function badRequest(res) {
  end(res, 400, {});
}
  
function verifyMethod(method, callback) {
  return function (req, res) {
    if (req.method === method.toUpperCase()) {
      callback.apply(null, arguments);
    } else {
      badRequest(res);
    }
  };
}

function getNextTick(cron) {
  //XXX I don't like this
  var s = later.parse.cron(cron);
  var t = later.schedule(s).next();
  if (!isNaN(t.getTime())) {
    return t;
  }
}
  
function authorize(callback) {
  return function () {
    var auth = this.request.headers.authorization;
    var match;
    if (!auth) {
      requireCredentials(this);
    } else {
      match = /Basic\s+([\w\d]+)/.exec(auth);
      if (!match) {
        requireCredentials(this);
      } else {
        auth = (new Buffer(match[1], 'base64')).toString().split(':');
        if (Meteor.users.find({ appKey: auth[0], appSecret: auth[1] }).count() == 0) {
          end(this, 403, { error: 403, message: 'Access denied.' });
        }
      }
    }
  };
}

/*
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