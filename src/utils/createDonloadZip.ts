import type { BlobTree } from 'src/types';
import JsZip from 'jszip';
import { saveAs } from 'file-saver';
import { downloadStatus } from '@stores/downloadStatus';

function typedArrayToBuffer(array: Uint8Array) {
  return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
}

export const createDownloadZip = async (data: BlobTree) => {
  console.log('Start generating images');
  downloadStatus.setMessage('Start generating images');
  const zip = new JsZip();

  // Replace with a proper readme
  zip.file('Hello.txt', 'Hello World\n');

  for (const folderName in data) {
    let folder: JsZip;
    if (folderName === 'root') {
      folder = zip;
    } else {
      folder = zip.folder(folderName);
    }

    for (const nodeId in data[folderName]) {
      const { imageData, name } = data[folderName][nodeId];
      const cleanBytes = typedArrayToBuffer(imageData);
      const type = 'image/png';
      const extension = '.png';
      const blob = new Blob([cleanBytes], { type });
      folder.file(`${name}${extension}`, blob);
    }
  }
  const zipFile = await zip.generateAsync({ type: 'blob' });
  downloadStatus.setMessage('');
  saveAs(zipFile, 'example.zip');
};
