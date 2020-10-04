const { map } = require("lodash");

class ElasticSearch {
  constructor(connectionConfig, targetConfig, jobName) {
    this.connectionConfig = connectionConfig;
    this.targetConfig = targetConfig;
    this.jobName = jobName;
    this.topicName = `topic_${this.jobName}`;
    this.clusterUrl = `${this.connectionConfig.api.url}:${this.connectionConfig.api.port}`;
    this.syncIndexName = 'pg_sync';
    this.isReady = false; // this variable is set to true after all configuration on ES cluster is done, until then all events from source DB will be discarded
    this.syncBatchSize = 1000; // this is for starter sync job, represents each batch size for per sync interval

    (async () => {
      await this.validateConfigAndBuild();
    })();
  }

  async validateConfigAndBuild() {
    /*
    FLOW HERE;
    - Check sync index and create if not exists, check sync doc for job
      - If exists
        - run startSync();
      - If not exists
        - Create doc with default values
        - Request data from PG and listen for answer
        - When you get answer, update the doc
        - run startSync();
    */
    await this.createSyncIndexIfNotExists();
    const syncDoc = await this.getSyncDoc();

    if (_.isNil(syncDoc)) {
      log('Sync does not started on cluster, configuring it for the first time');

      EventEmitter.emit(this.topicName, { operation: Enums.TASK.HOW_MANY_YOU_HAVE });
    } else {
      this.startSync(); // this is async but we dont wait for the response
    }
  }

  async isIndexExists(index) {
    const [err, data] = await to(got(`${this.clusterUrl}/_cat/indices?format=json`));

    if (err) throw new Error('Failed to list indices on cluster');

    const result = _.find(JSON.parse(data.body), f => f.index === index);

    return !_.isNil(result);
  }

  async createSyncIndexIfNotExists() {
    if (await this.isIndexExists(this.syncIndexName)) return;

    log('Sync index does not exist on cluster');

    const [err, data] = await to(got.put(`${this.clusterUrl}/${this.syncIndexName}`, {
      json: {
        mappings: {
          properties: {
            job: { type: Enums.TargetMappingType.TEXT },
            last_offset: { type: Enums.TargetMappingType.INTEGER },
            total_count: { type: Enums.TargetMappingType.INTEGER },
            is_completed: { type: Enums.TargetMappingType.BOOLEAN },
            created_at: { type: Enums.TargetMappingType.DATE },
            last_synced_at: { type: Enums.TargetMappingType.DATE },
          }
        }
      },
      responseType: 'json'
    }));

    if (err && err.response.body.error.type !== 'resource_already_exists_exception') throw new Error(`Can not create sync index on cluster ${this.connectionConfig.name}`);

    log('Sync index has been created on cluster');
  }

  async getSyncDoc() {
    const [err, res] = await to(got.get(`${this.clusterUrl}/${this.syncIndexName}/_search?q=job:${this.jobName}`));

    if (err) throw new Error(`Error while getting sync doc: ${err}`);

    const body = JSON.parse(res.body);

    if (_.isArray(body.hits.hits) && body.hits.hits.length > 0) return body.hits.hits[0]._source;

    return null;
  }

  async setDataForSync(dataCount) {
    const [err, res] = await to(got.post(`${this.clusterUrl}/${this.syncIndexName}/_update/${this.jobName}`, {
      json: {
        doc: {
          job: this.jobName,
          last_offset: 0,
          total_count: dataCount,
          is_completed: false,
          created_at: (new Date()).getTime(),
          last_synced_at: (new Date()).getTime(),
        },
        doc_as_upsert: true
      },
      responseType: 'json'
    }));

    if (err) throw new Error(`Error while creating sync doc on ES cluster: ${err}`);

    log('Created sync doc on cluster');

    setTimeout(this.startSync.bind(this), 1000);// this is async but we dont wait for the response, putting 1sec await for ES to take affect of doc
  }

  async startSync() {
    /*
    FLOW HERE:
    - set isReady=true so that it'll start processing events from DB
    - Get latest configuration from ES
      - If its completed, do nothing
      - If its not completed
        - Request data from PG from where you left and listen for it
        - When its done, mark job as done
    */
    await this.createTargetIndexIfNotExists();
    await this.createTargetIndexIfNotExists();

    this.isReady = true; // setting this true so events coming from DB will be processed from now on

    const syncDoc = await this.getSyncDoc();

    if (_.isNil(syncDoc)) throw new Error('Error while getting sync doc'); // this should not happen
    if (syncDoc.is_completed) return log('General sync is already done');
    if ((parseInt(syncDoc.total_count) - parseInt(this.syncBatchSize)) <= parseInt(syncDoc.last_offset)) {
      // if sync job already completed but somehow has not been marked as completed yet, mark it for the next run
      log('General sync is already done')
      return await this.updateSyncDoc({ is_completed: true });
    }

    // request first batch from data source, remaining part will be recursive
    EventEmitter.emit(this.topicName, {
      operation: Enums.TASK.BRING_MORE_DATA,
      data: {
        limit: this.syncBatchSize,
        offset: syncDoc.last_offset,
      }
    });
  }

  async syncData(data) {
    log(`new batch arrived for sync, ${data.length} rows`);

    if (data.length === 0) {
      log('No more data, stopping sync');

      return await this.updateSyncDoc({ is_completed: true });
    }

    const syncDoc = await this.getSyncDoc();
    const start = (new Date()).getTime();

    for (let i = 0; i < data.length; i++) {
      await this.insert(data[i]);
    }

    const newOffset = parseInt(syncDoc.last_offset) + data.length;
    await this.updateSyncDoc({ last_offset: newOffset });

    const timeSpent = (new Date()).getTime() - start;
    log(`${data.length} rows have been processed (${timeSpent}), requesting new batch`);

    EventEmitter.emit(this.topicName, {
      operation: Enums.TASK.BRING_MORE_DATA,
      data: {
        limit: this.syncBatchSize,
        offset: newOffset,
      }
    });
  }

  async updateSyncDoc(updateContent) {
    updateContent['last_synced_at'] = (new Date()).getTime();
    const [err, res] = await to(got.post(`${this.clusterUrl}/${this.syncIndexName}/_update/${this.jobName}`, {
      json: {
        doc: updateContent,
        doc_as_upsert: true
      },
      responseType: 'json'
    }));

    if (err) {
      // this error is not a blocker, even if we continue from last offset its not a problem since its an upsert op
      log(`ERROR while updating sync doc: ${err}`);
    }

    log(`(${this.jobName}) sync doc updated at ${this.targetConfig.name}: ${JSON.stringify(updateContent)}`);
  }

  async createTargetIndexIfNotExists() {
    /*
   FLOW HERE:
   - Check if index exists
    - If so
      - TODO: check mappings (by type) and update, next version
    - If not
      - create with proper mappings (by type)
   */
    if (!(await this.isIndexExists(this.targetConfig.index))) {
      log(`Target index has not been created yet, creating index ${this.targetConfig.index}`);

      const properties = {};

      switch (this.targetConfig.type) {
        case Enums.TargetType.INDEX:
          _.each(this.targetConfig.mappings, e => { properties[e.alias] = { type: e.type }; });
          break;
        case Enums.TargetType.PROPERTY:
          _.each(this.targetConfig.mappings, e => { properties[e.alias] = { type: e.type }; });
          break;
        case Enums.TargetType.OBJECT:
          const props = {};
          _.each(this.targetConfig.mappings, e => { props[e.alias] = { type: e.type }; });
          properties[this.targetConfig.object.name] = { properties: props };
          break;
        case Enums.TargetType.NESTED:
          properties[this.targetConfig.nested.name] = { type: Enums.TargetType.NESTED };
          break;
      }

      const [err, res] = await to(got.put(`${this.clusterUrl}/${this.targetConfig.index}`, {
        json: {
          mappings: {
            properties: properties
          }
        },
        responseType: 'json'
      }));

      if (err) throw new Error(`Error while creating target index: ${err}`);

      log(`index ${this.targetConfig.index} has been created`);
    }
  }

  async insert(data) {
    if (!this.isReady) return;

    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        await this.INDEX.upsert(data);
        break;
      case Enums.TargetType.PROPERTY:
        await this.PROPERTY.upsert(data);
        break;
      case Enums.TargetType.OBJECT:
        await this.OBJECT.upsert(data);
        break;
      case Enums.TargetType.NESTED:
        await this.NESTED.insert(data);
        break;
    }
  }

  async update(data) {
    if (!this.isReady) return;

    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        await this.INDEX.upsert(data);
        break;
      case Enums.TargetType.PROPERTY:
        await this.PROPERTY.upsert(data);
        break;
      case Enums.TargetType.OBJECT:
        await this.OBJECT.upsert(data);
        break;
      case Enums.TargetType.NESTED:
        await this.NESTED.update(data);
        break;
    }
  }

  async delete(data) {
    if (!this.isReady) return;

    // No delete operation for PROPERTY type
    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        await this.INDEX.delete(data);
        break;
      case Enums.TargetType.OBJECT:
        await this.OBJECT.delete(data);
        break;
      case Enums.TargetType.NESTED:
        await this.NESTED.delete(data);
        break;
    }
  }

  get INDEX() {
    return {
      upsert: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            doc: mappedData,
            doc_as_upsert: true
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.INSERT,
            data: data,
          });
        }

        log(`(${this.jobName}) pushed to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
      delete: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.delete(`${this.clusterUrl}/${this.targetConfig.index}/_doc/${id}`));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.DELETE,
            data: data,
          });
        }

        log(`(${this.jobName}) deleted from ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
    };
  }

  get PROPERTY() {
    return {
      upsert: async (data) => {
        const mappedData = this.mapData(data);
        const sourceValue = mappedData[this.targetConfig.property.compare.source];

        if (_.isNil(sourceValue)) return;

        const params = _.omit(mappedData, [this.targetConfig.property.compare.source]);
        const mappings = _.filter(this.targetConfig.mappings, f => f.source_column !== this.targetConfig.property.compare.source);

        if (Object.keys(params).length !== mappings.length) return;

        const script = [];

        _.forOwn(params, (value, key) => {
          script.push(`ctx._source['${key}'] = params['${key}'];`);
        });

        const query = {
          term: {}
        };
        query['term'][this.targetConfig.property.compare.target] = sourceValue;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update_by_query?conflicts=proceed`, {
          json: {
            script: {
              inline: script.join(' '),
              params: params
            },
            query: query
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.INSERT,
            data: data,
          });
        }

        log(`(${this.jobName}) pushed to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      }
    };
  }

  get OBJECT() {
    return {
      upsert: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const doc = {};
        doc[this.targetConfig.object.name] = mappedData;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            doc: doc,
            doc_as_upsert: true
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.INSERT,
            data: data,
          });
        }

        log(`(${this.jobName}) pushed object to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(doc)}`);
      },
      delete: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const doc = {};
        doc[this.targetConfig.object.name] = null;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            doc: doc,
            doc_as_upsert: true
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.DELETE,
            data: data,
          });
        }

        log(`(${this.jobName}) deleted from ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
    };
  }

  get NESTED() {
    return {
      insert: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            script: {
              inline: `if(!ctx._source.containsKey('${this.targetConfig.nested.name}')){ctx._source['${this.targetConfig.nested.name}']=[]}ctx._source['${this.targetConfig.nested.name}'].add(params.data)`,
              params: {
                data: mappedData
              }
            }
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.INSERT,
            data: data,
          });
        }

        log(`(${this.jobName}) pushed nested to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
      update: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            script: {
              inline: `if(ctx._source.containsKey('${this.targetConfig.nested.name}')){def targets = ctx._source['${this.targetConfig.nested.name}'].findAll(it -> it['${this.targetConfig.nested.id}'] == params.data['${this.targetConfig.nested.id}']); for (nest in targets) { for (change in params.data.entrySet()) { nest[change.getKey()] = change.getValue() } }}`,
              params: {
                data: mappedData
              }
            }
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.UPDATE,
            data: data,
          });
        }

        log(`(${this.jobName}) updated nested at ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
      delete: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            script: {
              inline: `if(ctx._source.containsKey('${this.targetConfig.nested.name}')){ctx._source['${this.targetConfig.nested.name}'].removeIf(it -> it['${this.targetConfig.nested.id}'] == params.data['${this.targetConfig.nested.id}'])}`,
              params: {
                data: mappedData
              }
            }
          },
          responseType: 'json'
        }));

        if (err) {
          // Send failed op to AWS if its configured
          failHandler.push({
            topic: this.topicName,
            operation: Enums.CRUD.DELETE,
            data: data,
          });
        }

        log(`(${this.jobName}) deleted nested from ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
    };
  }

  mapData(data) {
    let ret = _.filter(this.targetConfig.mappings, f => _.indexOf(_.keys(data), f.source_column) > -1); // get mapping with data
    ret = _.map(ret, m => _.pick(_.extend({ value: data[m.source_column] }, m), ['alias', 'value'])); // assign value and pick only required props
    ret = _.reduce(ret, (o, p) => {
      o[p.alias] = p.value
      return o;
    }, {}); // generate final mapped object

    return ret;
  }

  async dispose() {
    log(`disposed ${this.jobName} ES cluster`);
  }
}

module.exports = ElasticSearch;