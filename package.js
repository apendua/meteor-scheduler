(function () {
  "use strict";

  Package.describe({
    summary: "A minimalistic scheduling tool."
  });

  Package.on_use(function (api) {
    api.use(["underscore", "http", "webapp"]);
    
    api.add_files([
      'scheduler-client.js'
    ], 'client');
    
    api.add_files([
      'scheduler.js',
      'jobs.js'
    ], 'server');

    if (api.export !== undefined) {
      api.export('Scheduler');
    }
  });

}());
