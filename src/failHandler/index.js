const path = require('path');
const AWS = require('aws-sdk');
AWS.config.loadFromPath(path.join(__dirname, '..', 'config', 'aws.json')); // TODO: Config
const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
const queueURL = 'https://sqs.eu-west-1.amazonaws.com/790357599697/pg-es-queue'; // TODO: config

const failHandler = {
  start: () => {
    // TODO: Check config and work according to, if there is then work, otherwise discard
    setInterval(failHandler.receive, 1000) // TODO: change this interval
  },
  receive: async () => {
    const params = {
      AttributeNames: ["SentTimestamp"],
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

        if (!_.has(message, 'job') || !_.has(message, 'task') || !_.has(message, 'data')){
          await failHandler.delete(m.MessageId, m.ReceiptHandle);
          
          continue;
        }
        // TODO: process, redirect input to proper job
        console.log(message)
        //await failHandler.delete(m.MessageId, m.ReceiptHandle);
      }
    }
  },
  push: async (data) => {
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