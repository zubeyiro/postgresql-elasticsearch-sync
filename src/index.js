require('./globals');
const rest = myRequire('rest');
const sync = myRequire('sync');

rest.listen(5461, () => {
  console.log("rest is listening")
});

sync.loadJobs();
sync.start();