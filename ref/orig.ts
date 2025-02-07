import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// Configure the S3 client
const s3Client = new S3Client({
  // endpoint: 'https://741b020e5dd2db3e41f040f973d614a8.r2.cloudflarestorage.com', // LocalStack endpoint
  // forcePathStyle: true, // Required for LocalStack
  region: Bun.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: Bun.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Function to upload a file to S3
async function uploadFileToS3(
  bucketName: string,
  key: string,
  filePath: string
) {
  try {
    // Read the file
    const fileContent = await Bun.file(filePath).text();

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
    });
    console.time("send");
    const response = await s3Client.send(command);
    console.timeEnd("send");
    console.log("File uploaded successfully:", response);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error; // Re-throw the error for better error handling
  }
}

// Example usage
const bucketName = Bun.env.AWS_BUCKET_NAME || "";
await uploadFileToS3(
  bucketName,
  "vite.config.ts",
  "../vite.config.ts"
  // 'wacv24-2686.mp4',
  // '/Users/hk/Downloads/wacv24-2686.mp4'
);
