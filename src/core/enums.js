const TargetType = {
  INDEX: 'index',
  OBJECT: 'object',
  NESTED: 'nested',
};

const TargetMappingType = {
  INTEGER: 'integer',
  FLOAT: 'float',
  TEXT: 'text',
  DATE: 'date',
  BOOLEAN: 'boolean',
  IP: 'ip',
  OBJECT: 'object',
  NESTED: 'nested',
};

const CRUD = {
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

module.exports = {
  TargetType,
  TargetMappingType,
  CRUD,
};