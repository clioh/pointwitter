const sharp = require('sharp');
const { UserInputError } = require('apollo-server-micro');
const sgMail = require('@sendgrid/mail');

const uploadFileToS3 = require('../../s3');

sgMail.setApiKey(process.env.SENDGRID_KEY);

async function uploadMedia(upload) {
  const { file, fileType, size } = upload;
  if (size > 1000) {
    throw new UserInputError('Media too large. Try resizing');
  }
  const { createReadStream, filename } = await file;
  const stream = createReadStream();
  if (fileType === 'IMAGE') {
    const resizer = sharp()
      .resize({ width: 400 })
      .png();
    const resizedImage = await stream.pipe(resizer);
    const s3upload = await uploadFileToS3(resizedImage, `${filename}`);
    return s3upload.Location;
  }
  if (fileType === 'VIDEO') {
    const s3upload = await uploadFileToS3(stream, `${filename}`);
    return s3upload.Location;
  }
  throw new Error('Error uploading media');
}

async function sendResetEmail(recipient, resetToken) {
  const msg = {
    to: recipient,
    from: 'clio@clioharper.xyz',
    subject: 'Your Pointwitter password reset',
    html: `Hi there! <br /> It looks like you've requested a password reset.
    If you didn't, please ignore this email.
    If you did, your token is: <strong>${resetToken}</strong><br />
    Go ahead and throw that sucker in the resetPassword mutation and we'll get your password reset`,
  };
  await sgMail.send(msg);
}

module.exports = { uploadMedia, sendResetEmail };
