const AWS = require('aws-sdk');

// Configure the AWS environment
AWS.config.update({
  accessKeyId: process.env.DEV_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.DEV_AWS_SECRET_KEY,
});

const s3 = new AWS.S3();

async function uploadFileToS3(stream, filename) {
  const params = {
    Bucket: process.env.S3_BUCKET,
    Body: stream,
    Key: `${Date.now()}_${filename}`,
    ACL: 'public-read',
  };
  // Turn the upload into a promise so we can use async/await
  return s3.upload(params).promise();
}

module.exports = uploadFileToS3;
