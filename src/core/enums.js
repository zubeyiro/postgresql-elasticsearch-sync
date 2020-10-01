const TargetType = {
  INDEX: 'index',
  PROPERTY: 'property',
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

const TASK = {
  HOW_MANY_YOU_HAVE: 'how_many_you_have',
  I_HAVE_A_LOT: 'i_have_a_lot',
  BRING_MORE_DATA: 'bring_more_data',
  HERE_IS_YOUR_NEW_DATA: 'here_is_your_new_data',
};

module.exports = {
  TargetType,
  TargetMappingType,
  CRUD,
  TASK,
};