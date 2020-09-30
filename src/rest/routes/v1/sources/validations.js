const Joi = require('joi');

const validations = {
  createBody: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
    config: Joi.object({
      host: Joi.string().min(3).max(500).required(),
      port: Joi.number().min(1).required(),
      database: Joi.string().min(3).max(500).required(),
      user: Joi.string().min(3).max(500).required(),
      password: Joi.string().min(3).max(500).required(),
    }).required(),
  }),
  updateParams: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
  }),
  updateBody: Joi.object({
    config: Joi.object({
      host: Joi.string().min(3).max(500).required(),
      port: Joi.number().min(1).required(),
      database: Joi.string().min(3).max(500).required(),
      user: Joi.string().min(3).max(500).required(),
      password: Joi.string().min(3).max(500).required(),
    }).required(),
  }),
};

module.exports = validations;