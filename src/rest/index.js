const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const routes = myRequire('rest/routes/v1');
const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(cors());
app.options('*', cors());

app.use((err, req, res, next) => {
  if (err) {
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .send({
        status: false,
        data: err.msg,
      });
  }

  next();
})

app.use('/v1', routes);

app.use((req, res, next) => {
  const error = new Error('Not found');
  error.status = HttpStatus.NOT_FOUND;
  next(error);
});

app.use((error, req, res, next) => {
  res
    .status(error.status || HttpStatus.INTERNAL_SERVER_ERROR)
    .send({
      error: {
        status: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
        message: error.message || HttpStatus[error.status],
      },
    });
});


module.exports = app;