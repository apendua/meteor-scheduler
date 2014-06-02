(function () {
  "use strict";

  Package.describe({
    summary: "A minimalistic scheduling tool."
  });

  Package.on_use(function (api) {
    api.use("underscore", "http", "webapp");
    
    // TODO: add support for client
    api.add_files([
      'jobs.js',
      'scheduler.js'
    ], ['server']);

    if (api.export !== undefined) {
      api.export('Scheduler');
    }
  });

}());
