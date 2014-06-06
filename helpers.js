(function (Scheduler) {
  "use strict";

  Scheduler.isValidCron = (function () {
    // TODO: these guys may be a little too restrictive
    var regExp = [
      /^(\d{1,2}|\*)(\/\d{1,2})?$/,
      /^(\d{1,2})(\,\d{1,2})*$/,
      /^\d{1,2}-\d{1,2}(\/\d{1,2})?$/
    ];
    return function (cron) {
      // this is only to tell the difference between iso date and cron string so the tests are realy naive
      cron = cron.split(' ');
      if (cron.length !== 6) {
        return false;
      }
      return _.every(cron, function (field) {
        return _.any(regExp, function (re) {
          return re.test(field);
        })
      });
    }
  }());

}(Scheduler));


