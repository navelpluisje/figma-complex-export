(function () {
    'use strict';

    var MessageTypes;
    (function (MessageTypes) {
        MessageTypes["GetPages"] = "getPages";
        MessageTypes["Pages"] = "sendPages";
        MessageTypes["DownloadList"] = "downloadList";
        MessageTypes["DownloadData"] = "downloadData";
        MessageTypes["PrepareExport"] = "prepareExport";
        MessageTypes["CreateDownload"] = "createDownload";
        MessageTypes["DownloadMessage"] = "downloadMessage";
    })(MessageTypes || (MessageTypes = {}));

    function sendDownloadMessage(message) {
        if (figma) {
            figma.ui.postMessage({
                type: MessageTypes.DownloadMessage,
                data: message
            });
        }
    }
    const expandWithBlob = async (data) => {
        const result = {};
        for (const folder in data) {
            sendDownloadMessage(`Prepare data for folder: ${folder}`);
            result[folder] = {};
            for (const nodeId in data[folder]) {
                const node = figma.getNodeById(nodeId);
                const imageData = await node.exportAsync({ format: 'PNG', suffix: '', constraint: { type: 'SCALE', value: parseInt(data[folder][nodeId].scale, 10) }, contentsOnly: true });
                result[folder][nodeId] = Object.assign(Object.assign({}, data[folder][nodeId]), { imageData });
            }
        }
        sendDownloadMessage('Finished Preparing');
        return result;
    };

    const isExportPage = (name) => {
        return !/^_[\S\s]*_$/.test(name);
    };
    const getFolderData = (name) => {
        return /^[\w\s]*\(folder=([a-zA-Z0-9,\s/]*)\)(\s*\(scale=([0-9,\s]*)\))?/mi.exec(name);
    };

    const getExportPages = () => {
        return figma.root.children.reduce((acc, { name, id }) => {
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

    const createFileNames = (node, acc) => {
        const result = Object.assign({}, acc);
        const children = node.children;
        const tree = children.reduce((acc, child) => {
            if (!isExportPage(child.name)) {
                return acc;
            }
            const folderData = getFolderData(child.name);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            if (!folderData && (child === null || child === void 0 ? void 0 : child.children) && child.children.length) {
                console.log(child.name, child.children.length);
                return createFileNames(child, acc);
            }
            const folders = folderData[1].split(',');
            const scales = (folderData[3] || '1').split(',');
            folders.forEach((folderName) => {
                acc[folderName.trim()] = Object.assign({}, (acc[folderName.trim()] || {}));
            });
            child.children.forEach((child) => {
                folders.forEach((folderName, index) => {
                    acc[folderName.trim()] = Object.assign(Object.assign({}, (result[folderName.trim()] || {})), { [child.id]: {
                            name: child.name,
                            scale: scales[index],
                        } });
                });
            });
            return acc;
        }, result);
        return tree;
    };
    const getFileTree = (pageIds) => {
        const tree = pageIds.reduce((acc, id) => {
            const page = figma.getNodeById(id);
            if (isExportPage(page.name)) {
                return createFileNames(figma.getNodeById(id), acc);
            }
            return acc;
        }, {});
        return tree;
    };

    figma.showUI(__html__, { width: 800, height: 600, themeColors: true, });
    figma.ui.onmessage = async (message) => {
        switch (message.type) {
            case MessageTypes.GetPages:
                figma.ui.postMessage({
                    type: MessageTypes.Pages,
                    data: getExportPages(),
                });
                break;
            case MessageTypes.PrepareExport:
                figma.ui.postMessage({
                    type: MessageTypes.DownloadList,
                    data: getFileTree(message.data)
                });
                break;
            case MessageTypes.CreateDownload: {
                const x = message.data;
                const newData = await expandWithBlob(x);
                figma.ui.postMessage({
                    type: MessageTypes.DownloadData,
                    data: newData,
                });
                // console.log(message.data, x);
                // figma.ui.postMessage(getPageChildren(message.id));
            }
        }
    };

})();
