import type { Tree } from '@utils/getFileTree';
import { writable } from 'svelte/store';

const createDownloadList = () => {
  const { subscribe, set } = writable<Tree>({});

  return {
    subscribe,
    setList: (downloads: Tree) => set(downloads),
  };
};

export const downloadList = createDownloadList();
