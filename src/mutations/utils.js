const sharp = require("sharp");
const { PassThrough } = require("stream");
const uploadFileToS3 = require("../../s3");
const { UserInputError } = require("apollo-server-micro");

async function uploadMedia(upload) {
  const { file, fileType, size } = upload;
  if (size > 1000) {
    throw new UserInputError("Media too large. Try resizing");
  }
  const { createReadStream, filename } = await file;
  const stream = createReadStream();
  if (fileType === "IMAGE") {
    const resizer = sharp()
      .resize({ width: 400 })
      .png();
    const resizedImage = await stream.pipe(resizer);
    const upload = await uploadFileToS3(resizedImage, `${filename}`);
    return upload.Location;
  } else if (fileType === "VIDEO") {
    const upload = await uploadFileToS3(stream, `${filename}`);
    return upload.Location;
  }
  throw new Error("Error uploading media");
}

module.exports.default = uploadMedia;
