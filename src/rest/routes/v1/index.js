const router = express.Router();

router.use('/sources', myRequire('rest/routes/v1/sources'));
router.use('/targets', myRequire('rest/routes/v1/targets'));
router.use('/jobs', myRequire('rest/routes/v1/jobs'));

module.exports = router;