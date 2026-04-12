/** Common interface for binary file storage backends */
export interface StorageAdapter {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
  deleteMany(keys: string[]): Promise<void>;
}
