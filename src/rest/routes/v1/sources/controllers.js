const controllers = {
  list: async (req, res) => { res.status(HttpStatus.OK).send(configService.sources.list()); },
  get: async (req, res) => { res.status(HttpStatus.OK).send(configService.sources.get(req.params.name)); },
  create: async (req, res) => { res.status(HttpStatus.OK).send(configService.sources.create(req.body)); },
  update: async (req, res) => {
    const update = {
      name: req.params.name,
      config: req.body.config
    };
    res.status(HttpStatus.OK).send(configService.sources.update(update));
  },
};

module.exports = controllers;

/*
TODO:
  # DELETE
    - check if there are any jobs using it
*/