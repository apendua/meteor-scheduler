(function () {
  "use strict";

  Package.describe({
    summary: "A minimalistic scheduling tool."
  });

  Package.on_use(function (api) {
    api.use(['underscore', 'http', 'webapp']);
    Npm.depends({connect: '2.9.0'});
    
    api.add_files([
      'scheduler-client.js'
    ], 'client');
    
    api.add_files([
      'scheduler.js',
      'jobs.js'
    ], 'server');

    // use on both client and server
    api.add_files([
      'helpers.js'
    ]);

    if (api.export !== undefined) {
      api.export('Scheduler');
    }
  });

}());
