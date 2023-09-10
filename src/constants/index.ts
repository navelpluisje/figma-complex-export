import type { PageData } from '@stores/pages';
import type { Tree } from '@utils/getFileTree';
import type { BlobTree } from 'src/types';

export enum MessageTypes {
  GetPages = 'getPages',
  Pages = 'sendPages',
  DownloadList = 'downloadList',
  DownloadData = 'downloadData',
  PrepareExport = 'prepareExport',
  CreateDownload = 'createDownload',
  DownloadMessage = 'downloadMessage',
}

export type MessageContents = {
  [MessageTypes.GetPages]: null,
  [MessageTypes.Pages]: PageData[],
  [MessageTypes.DownloadList]: Tree,
  [MessageTypes.DownloadData]: BlobTree,
  [MessageTypes.PrepareExport]: string[],
  [MessageTypes.CreateDownload]: Tree,
  [MessageTypes.DownloadMessage]: string | null,
}

export type Message<T extends MessageTypes> = {
  type: T,
  data: MessageContents[T],
}

export type PluginMessage<T extends MessageTypes> = {
  pluginMessage: Message<T>;
}

