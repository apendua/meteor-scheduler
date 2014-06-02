(function () {
  "use strict";

  Package.describe({
    summary: "A minimalistic scheduling tool."
  });

  Package.on_use(function (api) {
    api.add_files([
      'scheduler.js'
    ], ['client', 'server']);

    if (api.export !== undefined) {
      api.export('Scheduler');
    }
  });

}());
