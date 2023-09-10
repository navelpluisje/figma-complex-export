import { getFolderData, isExportPage } from './regexChecks';

export type Scale = '1' | '2';

export type Tree = {
  [foldername: string]: {
    [nodeId: string]: {
      name: string;
      scale: Scale,
    }
  }
}


const createFileNames = (node: BaseNode, acc): Tree => {
  const result: Tree = { ...acc };
  const children = (node as PageNode).children;

  const tree = children.reduce((acc, child) => {
    if (!isExportPage(child.name)) {
      return acc;
    }
    const folderData = getFolderData(child.name);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!folderData && child?.children && child.children.length) {
      console.log(child.name, (child as FrameNode).children.length);
      return createFileNames(child, acc);
    }

    const folders = folderData[1].split(',');
    const scales = (folderData[3] || '1').split(',') as Scale[];

    folders.forEach((folderName) => {
      acc[folderName.trim()] = {
        ...(acc[folderName.trim()] || {})
      };
    });

    (child as FrameNode).children.forEach((child) => {
      folders.forEach((folderName, index) => {
        acc[folderName.trim()] = {
          ...(result[folderName.trim()] || {}),
          [child.id]: {
            name: child.name,
            scale: scales[index],
          },
        };
      });
    });
    return acc;
  }, result);

  return tree;
};

export const getFileTree = (pageIds: string[]): Tree => {
  const tree = pageIds.reduce<Tree>((acc, id) => {
    const page = figma.getNodeById(id);

    if (isExportPage(page.name)) {
      return createFileNames(figma.getNodeById(id), acc);
    }
    return acc;
  }, {});

  return tree;
};
