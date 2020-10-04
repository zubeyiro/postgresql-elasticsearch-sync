# PostgreSQL ElasticSearch Synchronization
This application provides multiple types of data sync options from PostgreSQL to ElasticSearch.

## How does it work
For each syncronization jobs, first it makes overall syncronization (pushes all data to ElasticSearch cluster), and then it uses `LISTEN/NOTIFY` functionality of PostgreSQL.

## Syncronization Types

### INDEX sync
INDEX sync option has 1 source table and it creates the corresponding index on ElasticSearch cluster, basically direct sync.

### PROPERTY sync
PROPERTY sync is a syncronization type that you can add properties continuously to existing index on ElasticSearch cluster without creating index from stracth.

### OBJECT sync
OBJECT sync is the type that you can add object with nested properties to existing index on ElasticSearch cluster.

### NESTED sync
NESTED sync is the type that you can add nested objects (arrays) to existing index on Elastic Search cluster.


## Configuration
This application has 3 different type of configs

- Source
Source represents PostgreSQL database which application will sync data from, each source should be added separately and named properly

- Target
Target represents ElasticSearch cluster which application will sync data to, each target should be added separately and named properly

- Job
Job represents each independent syncronization job. Application supports multiple jobs at a time.

## How to make configuration
Application have REST API that you can add/update/delete sources/targets/jobs runtime, REST documentation is at the end of this document. In order to set PORT for REST API, just set the environment variable PORT, or it will serve from default port which is **5461**.

## Handling Fails
Application configured to have AWS SQS for failed processes. In any case any sync operation fails, it'll push data to SQS queue and will try again after 1 minute.
AWS SQS is optional, in order to use it just set the following environment variables and its done.

```
AWS_ACCESS_KEY_ID=''
AWS_SECRET_ACCESS_KEY=''
AWS_REGION=''
AWS_SQS_URL=''
```

## Requirements
PostgreSQL database users on each source must have following privileges;
- CREATE FUNCTION
- CREATE TRIGGER
- run LISTEN command

## REST API

### Sources
Create/Update/Delete PostgreSQL database sources on application

**Create source:**
```
POST /sources
{
  "name": "mypsqlsource1",
  "config": {
    "host": "",
    "port": ,
    "database": "",
    "user": "",
    "password": ""
  }
}
```

**Update source:**
```
PUT /sources/:name
{
  "config": {
    "host": "",
    "port": ,
    "database": "",
    "user": "",
    "password": ""
  }
}
```

**Delete source:**
```
DELETE /sources/:name
```

**List sources:**
```
GET /sources
```

**Get source:**
```
GET /sources/:name
```

**Body Parameters**

| Parameter | Description | Required |
| --- | --- | --- |
| name | name for data sources, alphanumeric | Yes |
| config.host | host for PostgreSQL database | Yes |
| config.port | port for PostgreSQL database | Yes |
| config.database | database name on instance/cluster | Yes |
| config.user | username for PostgreSQL database | Yes |
| config.password | password for PostgreSQL database | Yes |

### Targets
Create/Update/Delete ElasticSeaarch clusters on application

**Create target:**
```
POST /targets
{
  "name": "",
  "api": {
    "url": "",
    "port": 
  }
}
```

**Update target:**
```
PUT /targets/:name
{
  "api": {
    "url": "",
    "port": 
  }
}
```

**Delete target:**
```
DELETE /targets/:name
```

**List target:**
```
GET /targets
```

**Get target:**
```
GET /targets/:name
```

**Body Parameters**

| Parameter | Description | Required |
| --- | --- | --- |
| name | name for ElasticSearch cluster, alphanumeric | Yes |
| api.url | API URL for ElasticSearch | Yes |
| api.port | API port for ElasticSearch | Yes |

### Jobs
Create/Update/Delete sync jobs on application

**Create job:**
```
POST /jobs
{
  "name": "",
  "source": {
    "name": "",
    "table_name": "",
    "columns": ["column_name1", "column_name2"]
  },
  "target": {
    "name": "",
    "index": "",
    "id": "",
    "type": "",
  "mappings": [
    {
      "source_column": "",
      "alias": "",
      "type": ""
    }
  ]
  }
}
```

**Update job:**
```
PUT /jobs/:name
{
  "source": {
    "name": "",
    "table_name": "",
    "columns": ["column_name1", "column_name2"]
  },
  "target": {
    "name": "",
    "index": "",
    "id": "",
    "type": "",
  "mappings": [
    {
      "source_column": "",
      "alias": "",
      "type": ""
    }
  ]
  }
}
```

**Delete job:**
```
DELETE /jobs/:name
```

**List job:**
```
GET /jobs
```

**Get job:**
```
GET /jobs/:name
```

**Job Request Body**

| Parameter | Description | Required |
| --- | --- | --- |
| name | Name for the job, alphanumeric | Yes |
| source.name | source PostgreSQL database that you have already created via /sources | Yes |
| source.table_name | table name to sync data from | Yes |
| source.columns | columns to sync, string array | Yes |
| target.name | target ElasticSearch cluster that you have already created via /targets | Yes |
| target.index | index name to sync on ElasticSearch cluster | Yes |
| target.type | 'index', 'property', 'object', 'nested | Yes |
| target.id | id field (alias) that'll be used on index | Yes (No if target.type is 'property') |
| target.property.compare.source | source column that will be used for join comparison | Only if target.type is 'property' |
| target.property.compare.target | target column that will be used for join comparison | Only if target.type is 'property' |
| target.object.name | property alias that object will be stored on doc | Only if target.type is 'object' |
| target.nested.id | id for each object inside nested | Only if target.type is 'nested' |
| target.nested.name | property alias that nested will be stored on doc | Only if target.type is 'nested' |
| mappings | Array | Yes |
| mappings.source_column | source column name on PostgreSQL | Yes |
| mappings.alias | Alias for the column on ElasticSearch | Yes |
| mappings.type | 'integer', 'float', 'text', 'date', 'boolean', 'ip', 'object', 'nested' | Yes |

