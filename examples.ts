import { S3Client } from "./src/client";
import type { S3File } from "./src/file";

// Initialize the S3 client
const s3 = new S3Client({
  accessKeyId: Bun.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: Bun.env.AWS_SECRET_ACCESS_KEY!,
  bucket: Bun.env.AWS_BUCKET_NAME!,
  // Optional configurations:
  // sessionToken: "<session-token>",
  // acl: "public-read",
  // endpoint: "https://s3.us-east-1.amazonaws.com", // AWS S3
  // endpoint: "https://<account-id>.r2.cloudflarestorage.com", // Cloudflare R2
  // endpoint: "https://<region>.digitaloceanspaces.com", // DigitalOcean Spaces
  // endpoint: "http://localhost:9000", // MinIO
});

// Example 1: Upload JSON data
const jsonData = { hello: "world", timestamp: Date.now() };
await s3.write("data.json", JSON.stringify(jsonData));

// Example 2: Read JSON file
const jsonFile = s3.file("data.json");
const content = await jsonFile.json();
console.log("JSON content:", content);

// Example 3: Upload a local file
const localFile = await Bun.file("README.md").arrayBuffer();
await s3.write("docs/README.md", localFile);

// Example 4: Generate a pre-signed URL
const preSignedUrl = await s3.presign("docs/README.md");
console.log("Pre-signed URL:", preSignedUrl);

// Example 5: Check if file exists and get size
const exists = await s3.exists("data.json");
if (exists) {
  const size = await s3.size("data.json");
  console.log("File size:", size, "bytes");
}

// Example 6: Stream a large file
const largeFile = s3.file("large-image.png");
const stream = await largeFile.stream();
if (stream) {
  const outputFile = Bun.file("downloaded-image.png");
  const writer = outputFile.writer();
  const reader = stream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    await writer.write(value);
  }
  console.log("Large file downloaded successfully");
}

// Example 7: Delete a file
const deleted = await s3.unlink("temporary-file.txt");
console.log("File deleted:", deleted);

// Example 8: Get file metadata
const stats = await s3.stat("data.json");
console.log("File metadata:", stats);

// Example 9: Read file as text
const textFile = s3.file("sample.txt");
const text = await textFile.text();
console.log("File contents:", text);

// Example 10: Quick file download using arrayBuffer
const imageFile = s3.file("small-image.png");
const imageBuffer = await imageFile.arrayBuffer();
await Bun.write("downloaded-small-image.png", imageBuffer);

// Example 11: List files and folders in a directory
const listing = await s3.list("docs/");
console.log("Files in docs/:", listing.files);
console.log("Subfolders in docs/:", listing.folders);

// Example 12: Get a flat list of all files (recursive)
const allFiles = await s3.all("uploads/2024/");
console.log("All files in uploads/2024/:", allFiles);
/* Sample output:
[
  "uploads/2024/01/report.pdf",
  "uploads/2024/02/image1.jpg",
  "uploads/2024/02/image2.jpg",
  "uploads/2024/notes.txt"
]
*/

// Example 13: Get a tree structure of files and folders
const tree = await s3.tree("");
console.log("File tree structure:", JSON.stringify(tree, null, 2));
/* Sample output:
[
  {
    "path": "docs",
    "type": "directory",
    "children": [
      {
        "path": "guide.pdf",
        "type": "file",
        "children": []
      },
      {
        "path": "images",
        "type": "directory",
        "children": [
          {
            "path": "diagram.png",
            "type": "file",
            "children": []
          }
        ]
      }
    ]
  },
  {
    "path": "config.json",
    "type": "file",
    "children": []
  }
]
*/

