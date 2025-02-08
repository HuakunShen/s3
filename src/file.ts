import {
  type BunFile,
  type S3File as BunS3File,
  type NetworkSink,
  type S3FilePresignOptions,
  type S3Options,
  type S3Stats,
} from "bun";
import type { S3Client } from "./client";

type BunS3File2 = Omit<BunS3File, "presign" | "slice"> & {
  slice: (start?: number, end?: number, contentType?: string) => S3File;
  presign: (options?: S3FilePresignOptions) => Promise<string>;
};

export class S3File extends Blob implements BunS3File2 {
  client: S3Client;

  constructor(
    name: string,
    client: S3Client,
    parts?: BlobPart[],
    options?: BlobPropertyBag
  ) {
    super(parts || [], options);
    this.name = name;
    this.client = client;
    // Initialize required properties
    this.readable = new ReadableStream();
    // this.size = 0;
    // this.type = "";
    // this.unlink = this.delete;
  }

  slice(start?: number, end?: number, contentType?: string): S3File {
    const blob = super.slice(start, end, contentType);
    return new S3File(this.name!, this.client, [blob], { type: blob.type });
  }

  exists(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  unlink(): Promise<void> {
    return this.delete();
  }

  readable: ReadableStream<any>;
  name?: string | undefined;
  bucket?: string | undefined;

  async write(
    data:
      | string
      | ArrayBuffer
      | Uint8Array
      | Blob
      | File
      | SharedArrayBuffer
      | ArrayBufferView,
    options?: S3Options
  ): Promise<number> {
    return this.client.write(this.name!, data, {
      ...options,
      bucket: this.bucket,
    });
  }

  presign(options?: S3FilePresignOptions): Promise<string> {
    return this.client.presign(this.name!, options);
  }

  async delete(): Promise<void> {
    return this.client.delete(this.name!, { bucket: this.bucket });
  }

  async stat(): Promise<S3Stats> {
    return this.client.stat(this.name!, { bucket: this.bucket });
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const url = await this.presign();
    const response = await fetch(url);
    return response.arrayBuffer();
  }

  async bytes(): Promise<Uint8Array> {
    const buffer = await this.arrayBuffer();
    return new Uint8Array(buffer);
  }

  async text(): Promise<string> {
    const buffer = await this.arrayBuffer();
    return new TextDecoder().decode(buffer);
  }

  async json(): Promise<any> {
    const text = await this.text();
    return JSON.parse(text);
  }

  async formData(): Promise<FormData> {
    const response = await fetch(await this.presign());
    return response.formData();
  }

  stream(): ReadableStream {
    return this.readable;
  }

  writer(options?: S3Options): NetworkSink {
    // This is a placeholder implementation
    // Bun's NetworkSink type isn't fully documented yet
    throw new Error("Method not implemented.");
  }
}
