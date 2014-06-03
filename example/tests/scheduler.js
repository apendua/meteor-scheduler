var scheduler = require('./lib/scheduler');
var commander = require('commander');

var options = commander
  .usage('[options]')
  .option('-p, --port <port> [default: 4000]', 4000)
  .parse(process.argv);

scheduler(options.port);