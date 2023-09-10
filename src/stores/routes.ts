import { writable } from 'svelte/store';

export interface Routes {
  pages: string[],
  currentPage: RoutePages,
  history: RoutePages[],
}

export enum RoutePages {
  Start = 0,
  Pages = 1,
  DownloadList = 2,
}

const createRoutes = () => {
  const { subscribe, update } = writable<Routes>({
    pages: [
      'start',
      'pages',
      'downloadList',
    ],
    currentPage: RoutePages.Start,
    history: [],
  });

  const setNewIndex = (index: RoutePages) => {
    update((routes) => {
      routes.currentPage = index;
      routes.history.push(index);
      return routes;
    });
  };

  const goBack = () => {
    if (history.length) {
      update((routes) => {
        routes.currentPage = routes.history.pop();
        return routes;
      });
    }
  };

  return {
    subscribe,
    setPage: (index: RoutePages) => setNewIndex(index),
    back: () => goBack()
  };
};

export const routes = createRoutes();
