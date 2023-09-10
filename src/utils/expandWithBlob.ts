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
  const result = {};
  for (const folder in data) {
    sendDownloadMessage(`Prepare data for folder: ${folder}`);
    result[folder] = {};

    for (const nodeId in data[folder]) {
      const node = figma.getNodeById(nodeId) as FrameNode;
      const imageData = await node.exportAsync({ format: 'PNG', suffix: '', constraint: { type: 'SCALE', value: parseInt(data[folder][nodeId].scale, 10) }, contentsOnly: true });
      result[folder][nodeId] = {
        ...data[folder][nodeId],
        imageData,
      };
    }
  }

  sendDownloadMessage('Finished Preparing');

  return result;
};
