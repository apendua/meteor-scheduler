var scheduler = require('./lib/scheduler');
var commander = require('commander');

var options = commander
  .usage('[options]')
  .option('-p, --port <number>', 'default is 4000', 4000)
  .parse(process.argv);

scheduler(options.port);