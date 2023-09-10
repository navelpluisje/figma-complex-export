export const isExportPage = (name: string): boolean => {
  return !/^_[\S\s]*_$/.test(name);
};

export const getFolderData = (name: string) => {
  return /^[\w\s]*\(folder=([a-zA-Z0-9,\s/]*)\)(\s*\(scale=([0-9,\s]*)\))?/mi.exec(name);
};
