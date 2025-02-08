import {
  type BunFile,
  type S3Client as BunS3Client,
  type S3File as BunS3File,
  type S3FilePresignOptions,
  type S3Options,
  type S3Stats,
} from "bun";
import { S3File } from "./file";
import {
  S3Client as RealS3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
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
      });
    }
  }

  realS3Client(options?: S3Options) {
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
    return new S3File(path, this, [], options);
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
    options?: S3Options
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
      })
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
      })
    );
  }
  async size(path: string, options?: S3Options): Promise<number> {
    const result = await this.realS3Client(options).send(
      new HeadObjectCommand({
        Bucket: this.options?.bucket,
        Key: path,
      })
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
      })
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
      })
    );
  }
}
