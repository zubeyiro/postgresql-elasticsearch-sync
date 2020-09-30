const { map } = require("lodash");

class ElasticSearch {
  constructor(connectionConfig, targetConfig, jobName) {
    this.connectionConfig = connectionConfig;
    this.targetConfig = targetConfig;
    this.jobName = jobName;
    this.clusterUrl = `${this.connectionConfig.api.url}:${this.connectionConfig.api.port}`;
    this.syncIndexName = 'pg_sync';

    (async () => {
      await this.validateConfigAndBuild();
    })();
  }

  async validateConfigAndBuild() {
    await this.createSyncIndexIfNotExists();
    // TODO:
    // runSyncConfig()
    // startListening()
    // configure syncs etc
    // continue where u left etc
    // check target index and create
  }

  async isIndexExists(index) {
    let [err, data] = await to(got(`${this.clusterUrl}/_cat/indices?format=json`));

    if (err) throw new Error('Failed to list indices on cluster');

    const indexResult = _.find(JSON.parse(data.body), f => f.index === index);

    return !_.isNil(indexResult);
  }

  async createSyncIndexIfNotExists() {
    if (!await this.isIndexExists(this.syncIndexName)) {
      // TODO:
      var a = [
        {
          total_count: 100000,
          synced_count: 0,
          last_offset: 1000,
          is_completed: false,
          started_at: 1600787712628,
          last_processed_at: 1600787712630
        }
      ];
      const [err, data] = await to(got.put(`${this.clusterUrl}/${this.syncIndexName}`, {
        json: {
          mappings: {
            properties: {
              order_id: { type: Enums.TargetMappingType.INTEGER },
              order_created_on: { type: Enums.TargetMappingType.DATE },
              order_status: { type: Enums.TargetMappingType.TEXT },
            }
          }
        },
        responseType: 'json'
      }));

      if (err && err.response.body.error.type !== 'resource_already_exists_exception') throw new Error(`Can not create sync index on cluster ${this.connectionConfig.name}`);
    }
  }

  async checkAndCreateMapping() {
    /*

    
    Check if index exists

      If so;
        If this is index;
          compare mapping
            If there are new mappings, add
        If this is property;
            check if it exists in mapping

      If not;
        If this is index;
        If this is property;
    */
    // check if index exists
    // if not create index


    // if its sub doc, check if exists on mapping, if not then create it
  }

  async insert(data) {
    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        this.INDEX.upsert(data);
        break;
      case Enums.TargetType.PROPERTY:
        this.PROPERTY.upsert(data);
        break;
      case Enums.TargetType.OBJECT:
        this.OBJECT.upsert(data);
        break;
      case Enums.TargetType.NESTED:
        this.NESTED.insert(data);
        break;
    }
  }

  async update(data) {
    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        this.INDEX.upsert(data);
        break;
      case Enums.TargetType.PROPERTY:
        this.PROPERTY.upsert(data);
        break;
      case Enums.TargetType.OBJECT:
        this.OBJECT.upsert(data);
        break;
      case Enums.TargetType.NESTED:
        this.NESTED.update(data);
        break;
    }
  }

  async delete(data) {
    // No delete operation for PROPERTY type
    switch (this.targetConfig.type) {
      case Enums.TargetType.INDEX:
        this.INDEX.delete(data);
        break;
      case Enums.TargetType.OBJECT:
        this.OBJECT.delete(data);
        break;
      case Enums.TargetType.NESTED:
        this.NESTED.delete(data);
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
          // TODO: Failed, push this to failed queue with err
        }

        log(`(${this.jobName}) pushed to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
      delete: async (data) => {
        const mappedData = this.mapData(data);
        const id = mappedData[this.targetConfig.id];

        if (_.isNil(id)) return;

        const [err, res] = await to(got.delete(`${this.clusterUrl}/${this.targetConfig.index}/_doc/${id}`));

        if (err) {
          // TODO: Failed, push this to failed queue with err
          console.log(err)
        }

        log(`(${this.jobName}) deleted from ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
    };
  }

  get PROPERTY() {
    return {
      upsert: async (data) => {
        // TODO: log all return statements
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
          // TODO: Failed, push this to failed queue with err
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
          // TODO: Failed, push this to failed queue with err
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
          // TODO: Failed, push this to failed queue with err
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

        const req = {
          script: {
            inline: `if(!ctx._source.containsKey('${this.targetConfig.nested.name}')){ctx._source['${this.targetConfig.nested.name}']=[]}ctx._source['${this.targetConfig.nested.name}'].add(params.data)`,
            params: {
              data: mappedData
            }
          }
        };

        console.log(req)
        console.log(JSON.stringify(req))

        const [err, res] = await to(got.post(`${this.clusterUrl}/${this.targetConfig.index}/_update/${id}`, {
          json: {
            script: {
              inline: `ctx._source['${this.targetConfig.nested.name}'].add(params.data)`,
              params: {
                data: mappedData
              }
            }
          },
          responseType: 'json'
        }));

        if (err) {
          // TODO: Failed, push this to failed queue with err
        }

        log(`(${this.jobName}) pushed nested to ${this.targetConfig.name}/${this.targetConfig.index}: ${JSON.stringify(mappedData)}`);
      },
      update: async (data) => {
        console.log("hello update nested")
        console.log(data)
        /*
POST /orders/_update/112233
{
  "script": {
    "source": "def targets = ctx._source.tickets.findAll(it -> it.id == params.doc.id); for (nest in targets) { for (change in params.doc.entrySet()) { nest[change.getKey()] = change.getValue() } }",
    "params": {
      "doc": {
        "id": 1,
        "seat": "F",
        "row": 101
      }
    }
  }
}
    */
      },
      delete: async (data) => {
        console.log("delete nested")
        console.log(data)
        /*
    POST /orders/_update/112233
{
  "script": {
    "lang": "painless",
    "source": "ctx._source.tickets.removeIf(it -> it.id == params.id)",
    "params": {
      "id": 2
    }
  }
}
    */
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
}

module.exports = ElasticSearch;