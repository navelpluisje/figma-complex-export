import { writable } from 'svelte/store';

const createExportPageIds = () => {
  const { subscribe, set, update } = writable<string[]>([]);

  const togglePage = (page: string) => {
    update((pages) => {
      if (pages.includes(page)) {
        const index = pages.findIndex((id) => id === page);
        pages.splice(index, 1);
      } else {
        pages.push(page);
      }
      return pages;
    });
  };

  const clearSelection = () => {
    update(() => []);
  };

  return {
    subscribe,
    setExportPageIds: (exportPages: string[]) => set(exportPages),
    togglePage,
    clearSelection,
  };
};

export const exportPageIds = createExportPageIds();
