const sharp = require('sharp');
const { UserInputError } = require('apollo-server-micro');
const uploadFileToS3 = require('../../s3');

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

module.exports = { uploadMedia };
