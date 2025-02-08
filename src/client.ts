import { type Node } from "./file";
import {
  type S3Client as BunS3Client,
  type S3File as BunS3File,
  type S3FilePresignOptions,
  type S3Options,
  type S3Stats,
} from "./types";
import { S3File } from "./file";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  ListObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client as RealS3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type IS3Client = Omit<BunS3Client, "new" | "file" | "presign"> & {
  presign: (path: string, options?: S3FilePresignOptions) => Promise<string>;
  file: (path: string, options?: S3Options) => S3File;
};

export class S3Client implements IS3Client {
  options?: S3Options;
  private _realS3Client?: RealS3Client;

  constructor(options: S3Options) {
    this.options = options;
    if (options.accessKeyId && options.secretAccessKey) {
      this._realS3Client = new RealS3Client({
        region: options?.region,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
        endpoint: options.endpoint,
      });
    }
  }

  realS3Client(options?: S3Options): RealS3Client {
    if (options) {
      if (!options.accessKeyId || !options.secretAccessKey) {
        throw new Error("accessKeyId and secretAccessKey are required");
      }
      this._realS3Client = new RealS3Client({
        region: options?.region,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
      });
    }
    if (!this._realS3Client) {
      throw new Error("S3Client not initialized");
    }
    return this._realS3Client;
  }

  file(path: string, options?: S3Options): S3File {
    return new S3File(path, this);
  }
  async write(
    path: string,
    data:
      | string
      | ArrayBuffer
      | Uint8Array
      | Blob
      | File
      | SharedArrayBuffer
      | ArrayBufferView,
    //   | Request
    //   | Response
    //   | BunFile
    //   | S3File
    options?: S3Options,
  ): Promise<number> {
    // convert data to Uint8Array
    let body: Uint8Array;
    if (typeof data === "string") {
      body = new TextEncoder().encode(data);
    } else if (data instanceof Blob || data instanceof File) {
      body = new Uint8Array(await data.arrayBuffer());
    } else if (data instanceof SharedArrayBuffer) {
      body = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      body = new Uint8Array(data.buffer);
    } else {
      body = new Uint8Array(data);
    }

    await this.realS3Client(options).send(
      new PutObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
        Body: body,
      }),
    );
    return body.length;
  }
  async presign(path: string, options?: S3FilePresignOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.options?.bucket,
      Key: path,
    });
    return getSignedUrl(this.realS3Client(options), command);
  }
  async unlink(path: string, options?: S3Options): Promise<void> {
    await this.realS3Client(options).send(
      new DeleteObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
      }),
    );
  }
  async size(path: string, options?: S3Options): Promise<number> {
    const result = await this.realS3Client(options).send(
      new HeadObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
      }),
    );
    return result.ContentLength ?? 0;
  }
  async exists(path: string, options?: S3Options): Promise<boolean> {
    try {
      await this.size(path, options);
      return true;
    } catch (error) {
      return false;
    }
  }
  async stat(path: string, options?: S3Options): Promise<S3Stats> {
    const result = await this.realS3Client(options).send(
      new HeadObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
      }),
    );
    return {
      size: result.ContentLength ?? 0,
      lastModified: result.LastModified ?? new Date(),
      etag: result.ETag ?? "",
      type: result.ContentType ?? "",
    };
  }
  async delete(path: string, options?: S3Options): Promise<void> {
    await this.realS3Client(options).send(
      new DeleteObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
      }),
    );
  }

  async list(
    path: string,
    options?: S3Options,
  ): Promise<{
    files: string[];
    folders: string[];
  }> {
    const cmd = new ListObjectsV2Command({
      Bucket: this.options?.bucket,
      Prefix: path,
      Delimiter: "/",
    });
    const result = await this.realS3Client(options).send(cmd);
    const files: string[] = result.Contents?.map((obj) => obj.Key)
      .filter((k): k is string => k !== undefined)
      .filter((k) => !k.endsWith("/")) || [];
    const folders =
      result.CommonPrefixes?.map((prefix) => prefix.Prefix).filter(
        (p): p is string => p !== undefined,
      ) || [];

    return {
      files,
      folders,
    };
  }

  /**
   * @example
   * ```ts
   * // Sample output
   * [ "123.json", "2023/11/12/7a24730a-468f-4932-9f5b-1410621e18d1.png", "2024/5/14/security-boundaries.DbwnKJ6Y_Z29rJiu.svg",
   * "2024/9/12/4MjHiKK.png", "2025/1/27/wacv24-2686.mp4", "2025/1/27/wacv24-2686.pdf", "a.mp4",
   * "components.json", "vite.config.ts"
   * ```
   * @param path
   * @param options
   * @returns
   */
  async all(path: string, options?: S3Options): Promise<string[]> {
    const cmd = new ListObjectsV2Command({
      Bucket: this.options?.bucket,
      Prefix: path,
    });
    const result = await this.realS3Client(options).send(cmd);
    return (
      result.Contents?.map((obj) => obj.Key)
        .filter((k): k is string => k !== undefined)
        .filter((k) => !k.endsWith("/")) || []
    );
  }

  /**
   * Return a tree structure of the files and folders in the given path.
   * This will list all files, so don't use it for large directories.
   * @param path
   * @param options
   * @returns
   */
  async tree(path: string, options?: S3Options): Promise<Node[]> {
    const files = await this.all(path, options);

    // Create a map to store all nodes
    const nodeMap = new Map<string, Node>();
    const root: Node[] = [];

    for (const filePath of files) {
      const parts = filePath.split("/");
      let currentPath = "";

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;

        // Build the current path
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!nodeMap.has(currentPath)) {
          const node: Node = {
            path: part,
            type: isLastPart ? "file" : "directory",
            children: [],
          };
          nodeMap.set(currentPath, node);

          if (i === 0) {
            // This is a top-level node
            root.push(node);
          } else {
            // Add this node as a child of its parent
            const parentPath = parts.slice(0, i).join("/");
            const parentNode = nodeMap.get(parentPath);
            if (parentNode) {
              parentNode.children.push(node);
            }
          }
        }
      }
    }

    return root;
  }

  async listBuckets(options?: S3Options): Promise<string[]> {
    const result = await this.realS3Client(options).send(
      new ListBucketsCommand({}),
    );
    return result.Buckets?.map((bucket) => bucket.Name ?? "") ?? [];
  }
}
