Scheduler.configure({
  schedulerUrl: process.env.SCHEDULER_URL
});

Scheduler.allow(function () {
  return true;
});
