const controllers = {
  list: async (req, res) => { res.status(HttpStatus.OK).send(configService.jobs.list()); },
  get: async (req, res) => { res.status(HttpStatus.OK).send(configService.jobs.get(req.params.name)); },
  create: async (req, res) => { res.status(HttpStatus.OK).send(configService.jobs.create(req.body)); },
  update: async (req, res) => {
    const update = {
      name: req.params.name,
      source: req.body.source,
      target: req.body.target,
    };
    res.status(HttpStatus.OK).send(configService.jobs.update(update));
  },
};

module.exports = controllers;

/*
TODO:
  # ADD
    - check if source exists
    - check if target exists
    - start the job
  # UPDATE
    - check if source exists
    - check if target exists
    - check content changes
    - reload the job
  # DELETE
    - shutdown the job
    - DELETE triggers and functions
*/