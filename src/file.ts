import {
  type NetworkSink,
  type S3File as BunS3File,
  type S3FilePresignOptions,
  type S3Options,
  type S3Stats,
} from "./types";
import type { S3Client } from "./client";

type BunS3File2 =
  & Omit<
    BunS3File,
    "presign" | "slice" | "stream" | "size" | "type"
  >
  & {
    presign: (options?: S3FilePresignOptions) => Promise<string>;
    stream: () => Promise<ReadableStream<Uint8Array> | null>;
    size: () => Promise<number>;
    type: () => Promise<string>;
  };

export class S3File implements BunS3File2 {
  client: S3Client;
  name: string;

  constructor(name: string, client: S3Client) {
    this.name = name;
    this.client = client;
    this.readable = new ReadableStream();
  }

  async size(): Promise<number> {
    return this.client.size(this.name);
  }

  async type(): Promise<string> {
    return this.client.stat(this.name).then((stats) => stats.type);
  }

  exists(): Promise<boolean> {
    return this.client.exists(this.name);
  }
  unlink(): Promise<void> {
    return this.delete();
  }

  readable: ReadableStream<any>;

  async write(
    data:
      | string
      | ArrayBuffer
      | Uint8Array
      | Blob
      | File
      | SharedArrayBuffer
      | ArrayBufferView,
    options?: S3Options,
  ): Promise<number> {
    return this.client.write(this.name, data, options);
  }

  presign(options?: S3FilePresignOptions): Promise<string> {
    return this.client.presign(this.name, options);
  }

  async delete(): Promise<void> {
    return this.client.delete(this.name);
  }

  async stat(): Promise<S3Stats> {
    return this.client.stat(this.name);
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

  async stream(): Promise<ReadableStream<Uint8Array> | null> {
    const url = await this.presign();
    const response = await fetch(url);
    return response.body;
  }

  writer(options?: S3Options): NetworkSink {
    // This is a placeholder implementation
    // Bun's NetworkSink type isn't fully documented yet
    throw new Error("Method not implemented.");
  }
}

export type Node = {
  path: string;
  type: "file" | "directory";
  children: Node[];
};
