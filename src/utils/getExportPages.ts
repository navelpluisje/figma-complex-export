import type { PageData } from '@stores/pages';
import { isExportPage } from './regexChecks';

export const getExportPages = (): PageData[] => {
  return figma.root.children.reduce<PageData[]>((acc, { name, id }) => {
    if (!isExportPage(name)) {
      return acc;
    }
    return [
      ...acc,
      {
        name,
        id
      }
    ];
  }, []);
};

