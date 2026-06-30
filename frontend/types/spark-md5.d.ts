declare module "spark-md5" {
  class SparkMD5 {
    constructor();
    append(str: string | ArrayBuffer): SparkMD5;
    appendBinary(str: string): SparkMD5;
    end(raw?: boolean): string;
    destroy(): void;
    reset(): SparkMD5;
    static hash(str: string, raw?: boolean): string;
    static hashBinary(str: string, raw?: boolean): string;
    static ArrayBuffer: SparkMD5ArrayBufferStatic;
  }

  interface SparkMD5ArrayBufferStatic {
    new(): SparkMD5ArrayBufferInstance;
    hash(arr: ArrayBuffer, raw?: boolean): string;
  }

  interface SparkMD5ArrayBufferInstance {
    append(arr: ArrayBuffer): SparkMD5ArrayBufferInstance;
    end(raw?: boolean): string;
    destroy(): void;
    reset(): SparkMD5ArrayBufferInstance;
    getState(): { buff: Uint8Array; hash: number[]; length: number };
    setState(state: { buff: Uint8Array; hash: number[]; length: number }): SparkMD5ArrayBufferInstance;
  }

  export default SparkMD5;
}
