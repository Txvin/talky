// electron/preload.cjs
// APIs mínimas expostas ao picker de compartilhamento.
// O renderer principal continua sem acesso direto ao Node/Electron.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('talkyDesktopPicker', {
  selectSource: (sourceId, quality = '1080p30') => {
    if (typeof sourceId === 'string' && sourceId.length > 0) {
      ipcRenderer.send('talky:desktop-source-selected', sourceId, quality)
    }
  },

  getLastScreenShareSelection: () => ipcRenderer.invoke('talky:get-last-screen-share-selection'),

  cancel: () => {
    ipcRenderer.send('talky:desktop-source-cancel')
  },
})
