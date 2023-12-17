import type { BlobTree } from 'src/types';
import JsZip from 'jszip';
import { saveAs } from 'file-saver';
import { downloadStatus } from '@stores/downloadStatus';

function typedArrayToBuffer(array: Uint8Array) {
  return array.buffer.slice(array.byteOffset, array.byteLength + array.byteOffset);
}

export const createDownloadZip = async (data: BlobTree) => {
  downloadStatus.setMessage('Start generating images');
  const zip = new JsZip();

  // Replace with a proper readme
  zip.file('readme.txt', `
    These files were exported from Figma using the Complex Export Plugin.\n
    If you like what this plugin does, consider donating at https://buymeacoffee.com/navelpluisje.\n
    \n
    Thank you and regards,

    Erwin
  `);

  for (const folderName in data) {
    let folder: JsZip | null;
    if (folderName === 'root') {
      folder = zip;
    } else {
      folder = zip.folder(folderName);
    }

    if (!folder) {
      return;
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
