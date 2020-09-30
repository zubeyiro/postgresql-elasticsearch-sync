const Job = myRequire('sync/Job');
const sync = {
  jobs: [],
  loadJobs: () => {
    _.forEach(configService.jobs.list(), (j) => sync.jobs.push(new Job(j)));
  },
  start: () => {
    _.forEach(sync.jobs, (j) => j.start());
  },
  // TODO:
  // reload existing job
  // add new job
  // remove job
};

module.exports = sync;