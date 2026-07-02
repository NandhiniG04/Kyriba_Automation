const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    selectFile: () => ipcRenderer.invoke('dialog:openFile'),
    runAutomation: (filePath) => ipcRenderer.send('start-playwright', filePath),
    onTableRowUpdate: (callback) => ipcRenderer.on('update-ui-table', callback),
    onComplete: (callback) => ipcRenderer.on('playwright-done', callback)
});