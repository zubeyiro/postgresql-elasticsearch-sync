require('./globals');
const rest = myRequire('rest');

rest.listen(5461, () => { // Put port on config
  log('REST listening on 5461');
});

syncService.loadJobs();
syncService.start();
failHandler.start();

failHandler.push({
  job: 'chainsync',
  task: Enums.CRUD.UPDATE,
  data: {
    my: '123',
    json: 1,
    data: 123123123
  }
});