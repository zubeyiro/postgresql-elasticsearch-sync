const Joi = require('joi');

const validations = {
  createBody: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
    source: Joi.object({
      name: Joi.string().alphanum().min(3).max(50).required(),
      table_name: Joi.string().min(3).max(500).required(),
      columns: Joi.array().items(Joi.string()).required(),
    }).required(),
    target: Joi.object({
      name: Joi.string().alphanum().min(3).max(50).required(),
      index: Joi.string().min(3).max(500).required(),
      id: Joi.string().min(2).max(500).required(),
      type: Joi.string().valid(
        Enums.TargetType.INDEX,
        Enums.TargetType.OBJECT,
        Enums.TargetType.NESTED,
      ).required(),
      object_name: Joi.string().min(3).max(500).when('type', { is: Enums.TargetType.OBJECT, then: Joi.required(), otherwise: Joi.optional() }),
      nested_name: Joi.string().min(3).max(500).when('type', { is: Enums.TargetType.NESTED, then: Joi.required(), otherwise: Joi.optional() }),
      nested_id: Joi.string().min(2).max(500).when('type', { is: Enums.TargetType.NESTED, then: Joi.required(), otherwise: Joi.optional() }),
      mappings: Joi.array().items(Joi.object({
        source_column: Joi.string().required(),
        alias: Joi.string().min(3).max(500).required(),
        type: Joi.string().valid(
          Enums.TargetMappingType.INTEGER,
          Enums.TargetMappingType.FLOAT,
          Enums.TargetMappingType.TEXT,
          Enums.TargetMappingType.DATE,
          Enums.TargetMappingType.BOOLEAN,
          Enums.TargetMappingType.IP,
          Enums.TargetMappingType.OBJECT,
          Enums.TargetMappingType.NESTED,
        ).required(),
      })).required(),
    }).required(),
  }),
  updateParams: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
  }),
  updateBody: Joi.object({
    source: Joi.object({
      name: Joi.string().alphanum().min(3).max(50).required(),
      table_name: Joi.string().min(3).max(500).required(),
      columns: Joi.array().items(Joi.string()).required(),
    }).required(),
    target: Joi.object({
      name: Joi.string().alphanum().min(3).max(50).required(),
      index: Joi.string().min(3).max(500).required(),
      id: Joi.string().min(2).max(500).required(),
      type: Joi.string().valid(
        Enums.TargetType.INDEX,
        Enums.TargetType.OBJECT,
        Enums.TargetType.NESTED,
      ).required(),
      object_name: Joi.string().min(3).max(500).when('type', { is: Enums.TargetType.OBJECT, then: Joi.required(), otherwise: Joi.optional() }),
      nested_name: Joi.string().min(3).max(500).when('type', { is: Enums.TargetType.NESTED, then: Joi.required(), otherwise: Joi.optional() }),
      nested_id: Joi.string().min(2).max(500).when('type', { is: Enums.TargetType.NESTED, then: Joi.required(), otherwise: Joi.optional() }),
      mappings: Joi.array().items(Joi.object({
        source_column: Joi.string().required(),
        alias: Joi.string().min(3).max(500).required(),
        type: Joi.string().valid(
          Enums.TargetMappingType.INTEGER,
          Enums.TargetMappingType.FLOAT,
          Enums.TargetMappingType.TEXT,
          Enums.TargetMappingType.DATE,
          Enums.TargetMappingType.BOOLEAN,
          Enums.TargetMappingType.IP,
          Enums.TargetMappingType.OBJECT,
          Enums.TargetMappingType.NESTED,
        ).required(),
      })).required(),
    }).required(),
  }),
};

module.exports = validations;