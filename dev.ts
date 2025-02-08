import { S3Client } from "./src/client";
import type { S3File } from "./src/file";

const client = new S3Client({
  accessKeyId: Bun.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY!,
  bucket: Bun.env.AWS_BUCKET_NAME!,
  // sessionToken: "..."
  // acl: "public-read",
  // endpoint: "https://s3.us-east-1.amazonaws.com",
  // endpoint: "https://<account-id>.r2.cloudflarestorage.com", // Cloudflare R2
  // endpoint: "https://<region>.digitaloceanspaces.com", // DigitalOcean Spaces
  // endpoint: "http://localhost:9000", // MinIO
});

// Bun.s3 is a global singleton that is equivalent to `new Bun.S3Client()`
const s3fileJson: S3File = client.file("123.json");
console.log(await s3fileJson.json());

// await s3file.write(JSON.stringify({ hello: "world" }));

// read README.md into a Blob
const blob = await Bun.file("README.md").arrayBuffer();

// console.log(await client.write("123.txt", blob));
// console.log(await client.presign("123.txt"));
// console.log(new TextDecoder().decode(await client.read("123.txt")));
const s3File = client.file("/2023/2/2/ezup-home.png");
console.log(await s3File.text());
// console.log(await s3File.formData());
// console.log(await s3File.text());
// console.log(await client.stat("123.txt"));
// console.log(await client.size("123.txt"));
// console.log(await client.exists("123.txt"));
// console.log(await client.unlink("123.txt"));
// console.log(await client.exists("123.txt"));
