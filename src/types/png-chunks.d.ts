declare module "png-chunks-extract" {
  export interface PngChunk {
    name: string;
    data: Uint8Array;
  }

  export default function extract(data: Uint8Array): PngChunk[];
}

declare module "png-chunks-encode" {
  import type { PngChunk } from "png-chunks-extract";

  export default function encode(chunks: PngChunk[]): Uint8Array;
}

declare module "png-chunk-text" {
  import type { PngChunk } from "png-chunks-extract";

  export function encode(keyword: string, text: string): PngChunk;
  export function decode(data: Uint8Array): {
    keyword: string;
    text: string;
  };
}
