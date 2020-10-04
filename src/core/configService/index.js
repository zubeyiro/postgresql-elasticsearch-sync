const genericCRUD = myRequire('core/configService/genericCRUD');

const sources = {
  list: () => { return genericCRUD.list('sources'); },
  get: (name) => { return genericCRUD.get('sources', name); },
  update: (config) => {
    const IOResult = genericCRUD.update('sources', config);

    _.each(syncService.jobs, e => {
      if (e.config.source.name === config.name) {
        e.restart(e.config.name);
      }
    });

    return IOResult;
  },
  create: (config) => { return genericCRUD.create('sources', config); },
  delete: (name) => {
    const job = _.find(syncService.jobs, f => f.config.source.name === name);

    if (!_.isNil(job)) return {
      result: false,
      data: 'There are jobs using this source, remove them first.'
    };

    return genericCRUD.delete('sources', name);
  },
};

const targets = {
  list: () => { return genericCRUD.list('targets'); },
  get: (name) => { return genericCRUD.get('targets', name); },
  update: (config) => {
    const IOResult = genericCRUD.update('targets', config);

    _.each(syncService.jobs, e => {
      if (e.config.target.name === config.name) {
        e.restart(e.config.name);
      }
    });

    return IOResult;
  },
  create: (config) => { return genericCRUD.create('targets', config); },
  delete: (name) => {
    const job = _.find(syncService.jobs, f => f.config.target.name === name);

    if (!_.isNil(job)) return {
      result: false,
      data: 'There are jobs using this target, remove them first.'
    };

    return genericCRUD.delete('targets', name);
  },
};

const jobs = {
  list: () => { return genericCRUD.list('jobs'); },
  get: (name) => { return genericCRUD.get('jobs', name); },
  update: (config) => {
    if (_.isNil(jobs.get(config.name))) return {
      result: false,
      data: 'No such job',
    };

    const source = sources.get(config.source.name);
    const target = targets.get(config.target.name);

    if (_.isNil(source)) return {
      result: false,
      data: 'No such source, add source first'
    };

    if (_.isNil(target)) return {
      result: false,
      data: 'No such target, add target first'
    };

    const IOResult = genericCRUD.update('jobs', config);

    syncService.restartJob(config.name);

    return IOResult;
  },
  create: (config) => {
    const source = sources.get(config.source.name);
    const target = targets.get(config.target.name);

    if (_.isNil(source)) return {
      result: false,
      data: 'No such source, add source first'
    };

    if (_.isNil(target)) return {
      result: false,
      data: 'No such target, add target first'
    };

    const IOResult = genericCRUD.create('jobs', config);
    syncService.addJob(config.name);

    return IOResult;
  },
  delete: (name) => {
    syncService.deleteJob(name);

    return genericCRUD.delete('jobs', name)
  },
};

module.exports = {
  sources,
  targets,
  jobs,
};
