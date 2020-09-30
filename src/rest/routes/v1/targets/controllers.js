const controllers = {
  list: async (req, res) => { res.status(HttpStatus.OK).send(configService.targets.list()); },
  get: async (req, res) => { res.status(HttpStatus.OK).send(configService.targets.get(req.params.name)); },
  create: async (req, res) => { res.status(HttpStatus.OK).send(configService.targets.create(req.body)); },
  update: async (req, res) => {
    const update = {
      name: req.params.name,
      api: req.body.api
    };
    res.status(HttpStatus.OK).send(configService.targets.update(update));
  },
};

module.exports = controllers;

/*
TODO:
  # DELETE
    - check if there are any jobs using it
*/