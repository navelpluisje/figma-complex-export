import { MessageTypes } from '@constants';
import type { BlobTree } from 'src/types';
import type { Tree } from './getFileTree';

function sendDownloadMessage(message: string) {
  if (figma) {
    figma.ui.postMessage({
      type: MessageTypes.DownloadMessage,
      data: message
    });
  }
}

export const expandWithBlob = async (data: Tree): Promise<BlobTree> => {
  const result: BlobTree = {};

  for (const folder in data) {
    let imageData: Uint8Array;

    sendDownloadMessage(`Prepare data for folder: ${folder}`);
    result[folder] = {};
    
    for (const nodeId in data[folder]) {
      const node = figma.getNodeById(nodeId) as FrameNode;
      const { hasPink, scale: scaleString } = data[folder][nodeId];
      const scale = Number(scaleString);
      
      if (hasPink && scale > 1) {
        // First we create a clone and resize it (The pink lines have to be scaled. The rest stays as it is)
        const tmpNode = node.clone();
        tmpNode.resizeWithoutConstraints(tmpNode.width - (1 - 1/scale) * 2, tmpNode.height - (1 - 1/scale) * 2);
        tmpNode.clipsContent = true;
        // Move the children a bit because of the pink resizing
        tmpNode.children.forEach(child => {
          child.x = child.x - (1 - 1 / scale);
          child.y = child.y - (1 - 1 / scale);
        });
        // Generate the image data
        imageData = await tmpNode.exportAsync({ format: 'PNG', suffix: '', constraint: { type: 'SCALE', value: scale }, contentsOnly: true });
        // remove the clone
        tmpNode.remove();
      } else {
        imageData = await node.exportAsync({ format: 'PNG', suffix: '', constraint: { type: 'SCALE', value: scale }, contentsOnly: true });
      }

      result[folder][nodeId] = {
        ...data[folder][nodeId],
        imageData,
      };
    }
  }
  
  sendDownloadMessage('Finished Preparing');
  return result;
};
