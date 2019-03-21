const AWS = require('aws-sdk');

const { S3_ACCESS_KEY_ID, S3_SECRET_KEY } = process.env;
// Configure the AWS environment
AWS.config.update({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_KEY,
});

const s3 = new AWS.S3();

async function uploadFileToS3(stream, filename) {
  const params = {
    Bucket: 'pointwitter',
    Body: stream,
    Key: `${Date.now()}_${filename}`,
    ACL: 'public-read',
  };
  // Turn the upload into a promise so we can use async/await
  return s3.upload(params).promise();
}

module.exports = uploadFileToS3;
