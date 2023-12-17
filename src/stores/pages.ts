import { MessageTypes } from '@constants';
import type { PluginMessage } from '@constants';
import { writable } from 'svelte/store';

export interface PageData {
  id: string;
  name: string;
}

const createPages = () => {
  const { subscribe, set } = writable<PageData[]>([]);

  const getPages = () => {
    parent.postMessage<PluginMessage<MessageTypes.GetPages>>(
      {
        pluginMessage: {
          type: MessageTypes.GetPages,
          data: null,
        },
      },
      '*'
    );
  };

  return {
    subscribe,
    setPages: (pages: PageData[]) => set(pages),
    getPages
  };
};

export const pages = createPages();
