const PostgreSQL = myRequire('sync/PostgreSQL');
const ElasticSearch = myRequire('sync/ElasticSearch');

class Job {
  constructor(config) {
    this.config = config;

    (async () => {
      await this.validateResources();
    })();
  }

  async validateResources() {
    await this.validateAndBuildSource();
    await this.validateAndBuildTarget();
  }

  async validateAndBuildSource() {
    const sourceConfig = configService.sources.get(this.config.source.name);

    if (_.isEmpty(sourceConfig)) throw new Error(`Invalid source for ${this.config.name}`);

    this.source = new PostgreSQL(sourceConfig, this.config.source, this.config.name);
  }

  async validateAndBuildTarget() {
    const targetConfig = configService.targets.get(this.config.target.name);

    if (_.isEmpty(targetConfig)) throw new Error(`Invalid target for ${this.config.name}`);

    this.target = new ElasticSearch(targetConfig, this.config.target, this.config.name);
  }

  async start() {
    log(`${this.config.name} has been started`);
    this.source.startListener();

    EventEmitter.on(this.source.TopicName, this.listenerCallback.bind(this));
  }

  async listenerCallback(payload) {
    switch (payload.operation) {
      case Enums.CRUD.INSERT:
        this.target.insert(payload.data);
        break;
      case Enums.CRUD.UPDATE:
        this.target.update(payload.data);
        break;
      case Enums.CRUD.DELETE:
        this.target.delete(payload.data);
        break;
      case Enums.TASK.HOW_MANY_YOU_HAVE:
        this.source.getTotalDataCount();
        break;
      case Enums.TASK.I_HAVE_A_LOT:
        this.target.setDataForSync(payload.data);
        break;
      case Enums.TASK.BRING_MORE_DATA:
        this.source.getBatch(payload.data.limit, payload.data.offset);
        break;
      case Enums.TASK.HERE_IS_YOUR_NEW_DATA:
        this.target.syncData(payload.data);
        break;
    }
  }

  async shutdown() {
    log(`Shutting down ${this.config.name}`);
    EventEmitter.removeListener(this.source.TopicName, this.listenerCallback);

    // TODO:
    // close source
    // close target etc
    // notify & stop job
  }
}

module.exports = Job;