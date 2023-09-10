import App from './App.svelte';
import { pages } from '../stores/pages';
import { downloadList } from '../stores/downloadList';
import { downloadStatus } from '../stores/downloadStatus';
import { MessageTypes, PluginMessage } from '@constants';
import { createDownloadZip } from '@utils/createDonloadZip';


window.onmessage = async ({ data }: MessageEvent) => {
  switch (data.pluginMessage.type) {
    case MessageTypes.Pages:
      pages.setPages((data as PluginMessage<MessageTypes.Pages>).pluginMessage.data);
      break;

    case MessageTypes.DownloadList:
      downloadList.setList((data as PluginMessage<MessageTypes.DownloadList>).pluginMessage.data);
      break;

    case MessageTypes.DownloadData:
      // And now do this magic: https://github.com/brianlovin/figma-export-zip/blob/main/src/ui.ts
      console.log('Data', (data as PluginMessage<MessageTypes.DownloadData>).pluginMessage.data);
      await createDownloadZip((data as PluginMessage<MessageTypes.DownloadData>).pluginMessage.data);
      break;

    case MessageTypes.DownloadMessage:
      console.log((data as PluginMessage<MessageTypes.DownloadMessage>).pluginMessage.data);
      downloadStatus.setMessage((data as PluginMessage<MessageTypes.DownloadMessage>).pluginMessage.data);
      break;

    default:
  }
};


// eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
const app = new App({
  target: document.body,
});

export default app;
