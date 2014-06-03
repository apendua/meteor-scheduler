#!/usr/bin/env node

var fs = require('fs');
var exec = require('exec');
var commander = require('commander');
var path = require('path');
var _ = require('underscore');

var options = commander
  .usage('[options]')
  .option('-v, --verbose', 'show more logs')
  .option('-t, --timeout <ms>', 'test-case timeout in milliseconds [default: 20000]', 20000)
  .option('-f, --files <relpath>', 'where the tests are [default: ./tests/specs]', '')
  .parse(process.argv);

// TODO: it would be nice if we could specify a directory as an argument
//       to the --files option for both karma and mocha

// XXX this needs to be in the global context so that
//     the mocha's "it" and "test" could be overwritten by laika
//     see for example: mocha/lib/interfaces/bdd.js#31
laika = {};

function runLaika(options) {
  // DEPENDENCIES:
  // phantomjs
  // mongodb
  // meteor
  //
  // BEFORE RUNNING:
  // before running an istance of mongodb must be spawned locally
  // listening on the default port

  options.files = options.files || './tests/specs';

  laika = require('./node_modules/laika/bin/_laika');

  // XXX for more options see: http://arunoda.github.io/laika/options.html
  laika.run({
    args     : [ options.files ],
    reporter : 'spec',
    ui       : 'bdd',
    mport    : 27017,
    timeout  : options.timeout,
    verbose  : options.verbose,
  });
}

runLaika(options);
