import { writable } from 'svelte/store';

const createDownloadStatus = () => {
  const { subscribe, set } = writable<string>('');

  return {
    subscribe,
    setMessage: (message: string) => set(message),
  };
};

export const downloadStatus = createDownloadStatus();
