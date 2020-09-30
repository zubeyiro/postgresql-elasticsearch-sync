const { map } = require("lodash");

class ElasticSearch {
  constructor(connectionConfig, targetConfig, jobName) {
    this.connectionConfig = connectionConfig;
    this.targetConfig = targetConfig;
    this.jobName = jobName;
    console.log(this.targetConfig)
    this.clusterUrl = `${this.connectionConfig.api.url}:${this.connectionConfig.api.port}`;
    this.syncIndexName = 'pg_sync';

    // TODO:
    // configure syncs etc
    // continue where u left etc

    (async () => {
      await this.validateConfigAndBuild();
    })();
  }

  async validateConfigAndBuild() {
    await this.createSyncIndexIfNotExists();
    // runSyncConfig()
    // startListening()
  }

  async isIndexExists(index) {
    let [err, data] = await to(got(`${this.clusterUrl}/_cat/indices?format=json`));

    if (err) throw new Error('Failed to list indices on cluster');

    return !_.isNil(_.find(JSON.parse(data.body), f => f.index === index));
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
      case Enums.TargetType.OBJECT:
        this.OBJECT.insert(data);
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
      case Enums.TargetType.OBJECT:
        this.OBJECT.update(data);
        break;
      case Enums.TargetType.NESTED:
        this.NESTED.update(data);
        break;
    }
  }

  async delete(data) {
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
        log("upsert index")
        console.log(data);

        const mappedData = this.mapData(data);

        console.log("# MAPPED")
        console.log(mappedData)
        console.log('id', mappedData[this.targetConfig.id])


        /*
    POST /orders1/_update/112233
    {
      "doc" : {
        "selami": "sahin"
        },
      "doc_as_upsert": true
    }
    */
      },
      delete: async (data) => {
        console.log("delete index")
        //DELETE /orders/_doc/112233
      },
    };
  }

  get OBJECT() {
    return {
      insert: async (data) => {
        console.log("hello insert")
      },
      update: async (data) => {
        console.log("hello update")
      },
      delete: async (data) => {
        console.log("delete")
      },
    };
  }

  get NESTED() {
    return {
      insert: async (data) => {
        console.log("hello insert nested")
        /*
        POST /orders/_update/112233
        {
          "script": {
            "lang": "painless",
            "source": "ctx._source.tickets.add(params.tickets)",
            "params": {
              "tickets": {
                "id": 3,
                "row": 7,
                "seat": "C"
              }
            }
      }
        */
      },
      update: async (data) => {
        console.log("hello update nested")
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