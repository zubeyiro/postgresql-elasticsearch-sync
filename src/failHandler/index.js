const AWS = require('aws-sdk');
let sqs;
let queueURL = '';
let isFailHandlerActive = false;

const failHandler = {
  start: () => {
    if (_.isNil(process.env.AWS_ACCESS_KEY_ID) || _.isNil(process.env.AWS_SECRET_ACCESS_KEY) || _.isNil(process.env.AWS_REGION) || _.isNil(process.env.AWS_SQS_URL)) return;

    queueURL = process.env.AWS_SQS_URL;
    AWS.config.update({ region: process.env.AWS_REGION });
    sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
    isFailHandlerActive = true;

    setInterval(failHandler.receive, 1000 * 60)
  },
  receive: async () => {
    if (!isFailHandlerActive) return;

    const params = {
      AttributeNames: [],
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ["All"],
      QueueUrl: queueURL,
      VisibilityTimeout: 20,
      WaitTimeSeconds: 0,
    };
    const [err, result] = await to(sqs.receiveMessage(params).promise());

    if (err) return log(`Error while receiving SQS messages: ${err}`);

    if (_.isArray(result.Messages) && result.Messages.length > 0) {
      for (const m of result.Messages) {
        const message = JSON.parse(m.Body);

        if (!_.has(message, 'topic') || !_.has(message, 'operation') || !_.has(message, 'data')) {
          await failHandler.delete(m.MessageId, m.ReceiptHandle);

          continue;
        }

        // Publish message again so related job can catch it
        EventEmitter.emit(message.topic, {
          operation: message.operation,
          data: message.data,
        });

        await failHandler.delete(m.MessageId, m.ReceiptHandle);
      }
    }
  },
  push: async (data) => {
    if (!isFailHandlerActive) return;

    const params = {
      DelaySeconds: 30,
      MessageAttributes: {},
      MessageBody: JSON.stringify(data),
      QueueUrl: queueURL,
    };
    const [err, result] = await to(sqs.sendMessage(params).promise());

    if (err) return log(`Error while pushing to SQS queue: ${err}`);

    log(`Message pushed to SQS (${result.MessageId}): ${JSON.stringify(data)}`);
  },
  delete: async (messageId, receiptHandle) => {
    if (!isFailHandlerActive) return;

    const params = {
      QueueUrl: queueURL,
      ReceiptHandle: receiptHandle,
    };
    const [err, result] = await to(sqs.deleteMessage(params).promise());

    if (err) return log(`Error while deleting SQS messages: ${err}`);

    log(`${messageId} deleted from SQS queue`);
  },
};

module.exports = failHandler;