import type { PageData } from '@stores/pages';

export const getPageChildren = (id: string): PageData[] => {
  const page = figma.getNodeById(id);
  return (page as FrameNode).children.map<PageData>((child) => ({
    name: child.name,
    id: child.id,
  }));
};

