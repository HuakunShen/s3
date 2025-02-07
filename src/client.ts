import {
  type BunFile,
  type S3Client as BunS3Client,
  type S3File,
  type S3FilePresignOptions,
  type S3Options,
  type S3Stats,
} from "bun";

export class S3Client implements Omit<BunS3Client, "new"> {
  options?: S3Options;

  constructor(options?: S3Options) {
    this.options = options;
  }

  file(path: string, options?: S3Options): S3File {
    throw new Error("Method not implemented.");
  }
  write(
    path: string,
    data:
      | string
      | ArrayBufferView
      | ArrayBuffer
      | SharedArrayBuffer
      | Request
      | Response
      | BunFile
      | S3File
      | Blob
      | File,
    options?: S3Options
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
  presign(path: string, options?: S3FilePresignOptions): string {
    throw new Error("Method not implemented.");
  }
  unlink(path: string, options?: S3Options): Promise<void> {
    throw new Error("Method not implemented.");
  }
  size(path: string, options?: S3Options): Promise<number> {
    throw new Error("Method not implemented.");
  }
  exists(path: string, options?: S3Options): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  stat(path: string, options?: S3Options): Promise<S3Stats> {
    throw new Error("Method not implemented.");
  }
  delete(path: string, options?: S3Options): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
