var _ = require('underscore');
var crypto = require('crypto');
var expect = require('chai').expect;
var Promise = require('es6-promise').Promise;

module.exports = {

  token: function () {
    // TODO: allow different length
    return crypto.randomBytes(8).toString('hex');
  },

  parseQueryString: function (qs) {
    expect(qs).not.to.be.empty;
    if (qs[0] === '?') {
      qs = qs.substr(1);
    }
    var queryData = {};
    _.each(qs.split('&'), function (part) {
      var match = /(\w+)=(.+)/.exec(part);
      if (match) {
        // TODO: should we call decodeURIComponent on mathc[1] ???
        // TODO: replace plus sign with space
        queryData[match[1]] = decodeURIComponent(match[2]);
      }
    });
    return queryData;
  },

  promise: function (connector) {
    if (!connector) {
      throw new ValueError('Connector must be an instance of ClientConnector or ServerConnector.');
    }
    if (connector.appUrl) {
      return new ClientPromise(connector, Promise.resolve());
    }
    return new ServerPromise(connector, Promise.resolve());
  },

  throttle: function (done) {
    return {
      times: function (wait) {
        var _err;
        return function (err) {
          // TODO: merge errors
          if (err) {
            _err = err;
          }
          wait -= 1;
          if (wait <= 0) {
            return done(_err);
          }
        }
      }, // times
    };
  },

};

var makeBoundedPromise = function (self, constructor, connector, promise) {
  // proxy the promise methods
  _.each([ 'then', 'catch' ], function (name) {
    self[name] = function () {
      return new constructor(connector, promise[name].apply(promise, arguments));
    }
  });

  // syntax sugar
  self.always = function (callback) {
    return self.then(callback, callback);
  };

  self.eval = function (code) {
    // TODO: here and in evalAsync remove the event listeneres on resolve or reject
    var args = _.toArray(arguments).splice(1).map(function (arg) {
      return JSON.stringify(arg);
    }).join(', ');
    // XXX pick some unique names for our control events
    var res_event = crypto.randomBytes(8).toString('hex');
    var err_event = crypto.randomBytes(8).toString('hex');
    // create a promise object
    return self.then(function () {
      return new Promise(function (resolve, reject) {
        connector.eval(
          'function () {\n' +
          '  try {\n' +
          '    var res = (' + code.toString() + '(' + args + '));\n' +
          '    emit("' + res_event + '", res);\n' +
          '  } catch (err) {\n' +
          '    emit("' + err_event + '", err.toString());\n' +
          '  }\n' +
          '}\n'
        ).once(res_event, function (res) { resolve(res); })
         .once(err_event, function (err) {
          reject(new Error(_.isObject(err) ? err.message : err));
        });
      }); // PROMISE
    }); // THEN
  }; // EVAL

  self.evalAsync = function (code) {
    var args = _.toArray(arguments).splice(1).map(function (arg) {
      return JSON.stringify(arg);
    }).join(', ');
    // XXX pick some unique names for our control events
    var res_event = crypto.randomBytes(8).toString('hex');
    var err_event = crypto.randomBytes(8).toString('hex');
    // create a promise object
    return self.then(function () {
      return new Promise(function (resolve, reject) {
        connector.eval(
          // allow defining some timeout
          'function () {\n' +
          '  var resolve = function (res) { emit("' + res_event + '", res); };\n' +
          '  var reject  = function (err) { emit("' + err_event + '", err); };\n' +
          '  try {\n' +
          '    (' + code.toString() + '(' + args + '));\n' +
          '  } catch (err) {\n' +
          '    emit("' + err_event + '", err.toString());\n' +
          '  }\n' +
          '}\n'
        ).once(res_event, function (res) { resolve(res); })
         .once(err_event, function (err) {
          reject(new Error(_.isObject(err) ? err.message : err));
        });
      }); // PROMISE
    }); // THEN
  }; // EVAL ASYNC

  // XXX I am not sure if we should wait for the previous promise
  self.once = function (name, callback) {
    return new constructor(connector, new Promise(function (resolve, reject) {
      connector.once(name, function () {
        try {
          resolve(callback.apply(null, arguments));
        } catch (err) {
          reject(err);
        }
      });
    })); // CONSTRUCTOR
  }; // ONCE

}; // makeBoundedPromise

ServerPromise = function (server, promise) {
  makeBoundedPromise(this, ServerPromise, server, promise);
}

ServerPromise.prototype = {

};

ClientPromise = function (client, promise) {
  makeBoundedPromise(this, ClientPromise, client, promise);
}

ClientPromise.prototype = {
  getText: function (selector) {
    return this.eval(function (selector) {
      return $(selector).text();
    }, selector);
  },

  click: function (selector) {
    return this.eval(function (selector) {
      click(selector);
    }, selector);
  },

  setValue: function (selector, value) {
    return this.eval(function (selector, value) {
      $(selector).val(value);
    }, selector, value);
  },

  // TODO: also implment this on server
  get: function (url) {
    return this.evalAsync(function (url) {
      HTTP.get(url, function (err, res) {
        if (err) {
          reject(err);
        } else {
          resolve(res);
        }
      });
    }, url);
  },

  getValue: function (selector) {
    return this.eval(function (selector) {
      return $(selector).val();
    }, selector);
  },

  getClass: function (selector) {
    return this.eval(function (selector) {
      var $query = $(selector);
      return $query.length > 0 ? $query.get(0).className : '';
    }, selector);
  },

  waitForDOM: function (selector, timeout) {
    return this.evalAsync(function (selector, timeout) {
      var handle;
      try {
        waitForDOM(selector, function () {
          // XXX I am not sure if we have to clearTimeout
          handle && clearTimeout(handle);
          resolve();
        });
        if (timeout) {
          handle = setTimeout(function () {
            reject('Element ' + selector + ' not found.');
          }, timeout);
        }
      } catch (err) {
        reject(err);
      }
    }, selector, timeout !== undefined ? timeout : 15000 );
    // TODO: this constant should be defined somewhere else
  },

  waitForRoute: function (path) {
    return this.evalAsync(function (path) {
      waitForRoute(path, resolve);
    }, path);
  },

  waitAndClick: function (selector) {
    return this.waitForDOM(selector).click(selector);
  },
  
  waitUntilGone: function (selector) {
    return this.evalAsync(function (selector) {
      try {
        waitForDOM(function () {
          return $(selector).length === 0;
        }, resolve);
      } catch (err) {
        reject(err);
      }
    }, selector);
  },

  waitUntilNotVisible: function (selector) {
    return this.evalAsync(function (selector) {
      try {
        waitForDOM(function () {
          return !$(selector).is(':visible');
        }, resolve);
      } catch (err) {
        reject(err);
      }
    }, selector);
  },

  checkIfExist: function (selector) {
    return this.eval(function (selector) {
      return $(selector).length > 0;
    }, selector);
  },

  checkIfVisible: function (selector) {
    return this.eval(function (selector) {
      return $(selector).is(':visible');
    }, selector);
  },

  // ASSERTIONS

  expectExist: function (selector) {
    return this.checkIfExist(selector).then(function (exist) {
      expect(exist).to.be.true;
    });
  },

  expectNotExist: function (selector) {
    return this.checkIfExist(selector).then(function (exist) {
      expect(exist).to.be.false;
    });
  },

  expectVisible: function (selector) {
    return this.checkIfVisible(selector).then(function (visible) {
      expect(visible).to.be.true;
    });
  },

  expectNotVisible: function (selector) {
    return this.checkIfVisible(selector).then(function (visible) {
      expect(visible).to.be.false;
    });
  },

  expectValueToBeEqual: function (selector, reference) {
    return this.getValue(selector).then(function (value) {
      expect(value).to.be.eql(reference);
    });
  },

  expectTextToBeEqual: function (selector, value) {
    return this.getText(selector).then(function (text) {
      expect(text).to.be.eql(value);
    });
  },

  expectTextToContain: function (selector, value) {
    return this.getText(selector).then(function (text) {
      expect(text).to.contain(value);
    });
  },

  expectToHaveClass: function (selector, value) {
    return this.getClass(selector).then(function (style) {
      expect(style).to.contain(value);
    });
  },
};

// ALIASES

module.exports.waitFor = module.exports.waitForDOM;
