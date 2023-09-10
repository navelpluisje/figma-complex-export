import type { Scale } from '@utils/getFileTree';

export type BlobTree = {
  [foldername: string]: {
    [nodeId: string]: {
      name: string;
      scale: Scale,
      imageData: Uint8Array,
    }
  }
}
