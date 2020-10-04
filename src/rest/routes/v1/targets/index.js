const router = express.Router();
const validator = require('express-joi-validation').createValidator({});
const validations = myRequire('rest/routes/v1/targets/validations');
const controllers = myRequire('rest/routes/v1/targets/controllers');

router.get('/', controllers.list);
router.get('/:name', controllers.get);
router.post('/', validator.body(validations.createBody), controllers.create);
router.put('/:name', validator.params(validations.updateParams), validator.body(validations.updateBody), controllers.update);
router.delete('/:name', controllers.delete);

module.exports = router;