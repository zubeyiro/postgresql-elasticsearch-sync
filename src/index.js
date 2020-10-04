require('./globals');
const rest = myRequire('rest');

rest.listen(process.env.PORT || 5461, () => {
  log(`REST listening on ${process.env.PORT || 5461}`);
});

syncService.loadJobs();
syncService.start();
failHandler.start();