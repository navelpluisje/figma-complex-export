import { Message, MessageContents, MessageTypes } from '@constants';
import { expandWithBlob } from '@utils/expandWithBlob';
import { getExportPages } from '@utils/getExportPages';
import { getFileTree } from '@utils/getFileTree';

figma.showUI(__html__, { width: 800, height: 600, themeColors: true, });

figma.ui.onmessage = async (message: Message<MessageTypes>) => {
  switch (message.type) {
  case MessageTypes.GetPages:
    figma.ui.postMessage({
      type: MessageTypes.Pages,
      data: getExportPages(),
    });
    break;

  case MessageTypes.PrepareExport:
    figma.ui.postMessage({
      type: MessageTypes.DownloadList,
      data: getFileTree((message.data as MessageContents[MessageTypes.PrepareExport]))
    }
    );
    break;

  case MessageTypes.CreateDownload: {
    const x = (message.data as MessageContents[MessageTypes.CreateDownload]);
    const newData = await expandWithBlob(x);
    figma.ui.postMessage({
      type: MessageTypes.DownloadData,
      data: newData,
    }
    );

    // console.log(message.data, x);
    // figma.ui.postMessage(getPageChildren(message.id));
  }
  }
};
