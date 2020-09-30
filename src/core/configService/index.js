const genericCRUD = myRequire('core/configService/genericCRUD');

const sources = {
  list: () => { return genericCRUD.list('sources'); },
  get: (name) => { return genericCRUD.get('sources', name); },
  update: (config) => { return genericCRUD.update('sources', config); },
  create: (config) => { return genericCRUD.create('sources', config); },
};

const targets = {
  list: () => { return genericCRUD.list('targets'); },
  get: (name) => { return genericCRUD.get('targets', name); },
  update: (config) => { return genericCRUD.update('targets', config); },
  create: (config) => { return genericCRUD.create('targets', config); },
};

const jobs = {
  list: () => { return genericCRUD.list('jobs'); },
  get: (name) => { return genericCRUD.get('jobs', name); },
  update: (config) => { return genericCRUD.update('jobs', config); },
  create: (config) => { return genericCRUD.create('jobs', config); },
};

module.exports = {
  sources,
  targets,
  jobs,
};