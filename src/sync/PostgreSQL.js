const { Client } = require('pg')
const path = require('path');
const IO = myRequire('core/configService/IO');

class PostgreSQL {
  get TopicName() { return this.topicName || ''; }

  constructor(connectionConfig, sourceConfig, jobName) {
    this.connectionConfig = connectionConfig;
    this.sourceConfig = sourceConfig;
    this.topicName = `topic_${jobName}`;
    this.functionName = `func_${jobName}`;
    this.triggerName = `trg_${jobName}`;
    this.client = new Client(this.connectionConfig.config);
    this.templatesPath = path.join(__dirname, 'templates');

    (async () => {
      await this.client.connect();
      await this.prepareDatabase();
    })();
  }

  async startListener() {
    const clientListener = new Client(this.connectionConfig.config);
    clientListener.on('notification', async (msg) => {
      if (msg.channel === this.topicName) {
        const payload = JSON.parse(msg.payload);

        switch (payload.f1) {
          case Enums.CRUD.INSERT:
          case Enums.CRUD.UPDATE:
          case Enums.CRUD.DELETE:
            EventEmitter.emit(this.topicName, {
              operation: payload.f1,
              data: _.pick(payload.f2, this.sourceConfig.columns),
            });
            // TODO:
            // Trim strings here
            // _.each(_.pick(payload.f2, this.sourceConfig.columns), e => console.log(typeof e));
            break;
        }
      }
    });

    clientListener.on('error', async (err) => {
      log(`Error on listener connection ${this.connectionConfig.name}`)
      log('Trying to reconnect');

      await clientListener.connect();
    });

    clientListener.on('end', () => { log(`Disconnected from ${this.connectionConfig.name}`); });

    await clientListener.connect();
    await clientListener.query(`LISTEN ${this.topicName};`);
  }

  async prepareDatabase() {
    await this.createFunctionIfNotExists();
    await this.createTriggerIfNotExists();
  }

  async createFunctionIfNotExists() {
    try {
      const res = await this.client.query(`SELECT * FROM pg_catalog.pg_proc WHERE proname = '${this.functionName}'`);

      if (res.rows.length > 0) return;

      let sqlCmd = IO.cat(path.join(this.templatesPath, 'pg_function.sql'));
      sqlCmd = sqlCmd
        .toString()
        .replace('%function_name%', this.functionName)
        .replace('%topic_name%', this.topicName);

      await this.client.query(sqlCmd);
    } catch (e) {
      throw new Error(`Error while creating function ${this.functionName}: ${e.message}`);
    }
  }

  async createTriggerIfNotExists() {
    try {
      const res = await this.client.query(`SELECT * FROM pg_trigger WHERE tgname = '${this.triggerName}'`);

      if (res.rows.length > 0) return;

      let sqlCmd = IO.cat(path.join(this.templatesPath, 'pg_trigger.sql'));
      sqlCmd = sqlCmd
        .replace('%trigger_name%', this.triggerName)
        .replace('%table_name%', this.sourceConfig.table_name)
        .replace('%function_name%', this.functionName);

      await this.client.query(sqlCmd);
    } catch (e) {
      throw new Error(`Error while creating trigger on table ${this.sourceConfig.table_name}: ${e.message}`);
    }
  }
}

module.exports = PostgreSQL;