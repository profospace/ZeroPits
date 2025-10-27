// config/awsConfig.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

/**
 * Upload file buffer to S3 and return its URL
 */
async function uploadToS3(fileBuffer, fileName, mimeType) {
    const upload = new Upload({
        client: s3Client,
        params: {
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: fileName,
            Body: fileBuffer,
            ContentType: mimeType,
        },
    });

    const result = await upload.done();
    return result.Location; // public S3 URL
}

module.exports = { uploadToS3 };
