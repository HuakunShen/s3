import { S3Client, type S3File } from "bun";

const client = new S3Client({
  accessKeyId: Bun.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY,
  bucket: Bun.env.AWS_BUCKET_NAME,
  // sessionToken: "..."
  // acl: "public-read",
  // endpoint: "https://s3.us-east-1.amazonaws.com",
  // endpoint: "https://<account-id>.r2.cloudflarestorage.com", // Cloudflare R2
  // endpoint: "https://<region>.digitaloceanspaces.com", // DigitalOcean Spaces
  // endpoint: "http://localhost:9000", // MinIO
});

// Bun.s3 is a global singleton that is equivalent to `new Bun.S3Client()`
const s3file: S3File = client.file("123.json");
await s3file.write(JSON.stringify({ hello: "world" }));
