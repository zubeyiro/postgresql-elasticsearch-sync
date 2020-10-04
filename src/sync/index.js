const Job = myRequire('sync/Job');

const sync = {
  jobs: [],
  loadJobs: () => {
    _.forEach(configService.jobs.list(), (j) => sync.jobs.push(new Job(j)));
  },
  start: () => {
    _.forEach(sync.jobs, (j) => j.start());
  },
  addJob: (jobName) => {
    const newConfig = configService.jobs.get(jobName);
    const newJob = new Job(newConfig);
    newJob.start();

    sync.jobs.push(newJob);
  },
  restartJob: (jobName) => {
    const newConfig = configService.jobs.get(jobName);
    const existingJobIdx = _.findIndex(sync.jobs, f => f.config.name === jobName);

    if (_.isNil(newConfig) || existingJobIdx < 0) return;

    sync.jobs[existingJobIdx].restart(newConfig);
  },
  deleteJob: async (jobName) => {
    const newConfig = configService.jobs.get(jobName);
    const existingJobIdx = _.findIndex(sync.jobs, f => f.config.name === jobName);

    if (_.isNil(newConfig) || existingJobIdx < 0) return;

    await sync.jobs[existingJobIdx].shutdown();

    _.remove(sync.jobs, n => n.config.name === jobName);

  },
};

module.exports = sync;