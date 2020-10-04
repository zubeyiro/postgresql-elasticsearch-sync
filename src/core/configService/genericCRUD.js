const path = require('path');
const IO = myRequire('core/configService/IO');
const configPath = path.join(__dirname, '..', '..', 'config');

const genericCRUD = {
  list: (scope) => {
    return _.map(
      IO.ls(
        path.join(configPath, scope),
        '.json'
      ),
      m => JSON.parse(
        IO.cat(path.join(configPath, scope, m))
      ));
  },
  get: (scope, name) => {
    return _.find(genericCRUD.list(scope), f => f.name === name) || null;
  },
  update: (scope, config) => {
    if (_.isEmpty(genericCRUD.get(scope, config.name))) return {
      result: false,
      data: 'There is no source with this name'
    };

    const result = IO.nano(path.join(configPath, scope, `${config.name}.json`), JSON.stringify(config, null, 2));

    return { result: result };
  },
  create: (scope, config) => {
    if (!_.isEmpty(genericCRUD.get(scope, config.name))) return {
      result: false,
      data: 'There is already source with the same name'
    };

    const result = IO.nano(path.join(configPath, scope, `${config.name}.json`), JSON.stringify(config, null, 2));

    return { result: result };
  },
  delete: (scope, name) => {
    if (_.isEmpty(genericCRUD.get(scope, name))) return {
      result: false,
      data: 'There is no source with this name'
    };

    const result = IO.rm(path.join(configPath, scope, `${name}.json`));

    return { result: result };
  },
};

module.exports = genericCRUD;