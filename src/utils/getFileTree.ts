import { getFileData, getFolderData, isExportPage } from './regexChecks';

export type Scale = '1' | '2';

export type Tree = {
  [foldername: string]: {
    [nodeId: string]: {
      name: string;
      scale: Scale;
      hasPink?: boolean;
    }
  }
}


const createFileNames = (node: BaseNode, acc: Tree): Tree => {
  const result: Tree = { ...acc };
  const children = (node as PageNode).children;

  const tree = children.reduce((acc, child) => {
    if (!isExportPage(child.name)) {
      return acc;
    }
    const folderData = getFolderData(child.name);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (folderData === null && child?.children && child.children.length) {
      console.log(child.name, (child as FrameNode).children.length);
      return createFileNames(child, acc);
    }

    const folders = (folderData as RegExpExecArray)[1].split(',');
    const scales = ((folderData as RegExpExecArray)[3] || '1').split(',') as Scale[];

    folders.forEach((folderName) => {
      acc[folderName.trim()] = {
        ...(acc[folderName.trim()] || {})
      };
    });

    (child as FrameNode).children.forEach((child) => {
      let hasPink = false;
      let name = child.name;
      const fileData = getFileData(child.name);

      if (Array.isArray(fileData) && fileData[1] === 'pink') {
        hasPink = true;
        name = child.name.split(/\s/)[0];
      }

      folders.forEach((folderName, index) => {
        acc[folderName.trim()] = {
          ...(result[folderName.trim()] || {}),
          [child.id]: {
            name,
            scale: scales[index],
            hasPink 
          },
        };
      });
    });
    return acc;
  }, result);

  return tree;
};

export const getFileTree = (pageIds: string[]) => {
  const tree = pageIds.reduce<Tree>((acc, id) => {
    const page = figma.getNodeById(id);

    if (page && isExportPage(page.name)) {
      return createFileNames(figma.getNodeById(id) as BaseNode, acc);
    }

    return acc;
  }, {});

  return tree;
};
