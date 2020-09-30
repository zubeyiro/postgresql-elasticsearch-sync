const Joi = require('joi');

const validations = {
  createBody: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
    api: Joi.object({
      url: Joi.string().uri().min(3).max(500).required(),
      port: Joi.number().min(1).required(),
    }).required(),
  }),
  updateParams: Joi.object({
    name: Joi.string().alphanum().min(3).max(50).required(),
  }),
  updateBody: Joi.object({
    api: Joi.object({
      url: Joi.string().uri().min(3).max(500).required(),
      port: Joi.number().min(1).required(),
    }).required(),
  }),
};

module.exports = validations;