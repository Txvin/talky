// electron/main.cjs — processo principal do Electron
const { app, BrowserWindow, session, desktopCapturer, shell, ipcMain } = require('electron')
const path = require('path')

const isDev = !app.isPackaged

let mainWindow = null
let pickerWindow = null
let pendingScreenShare = null
let lastScreenShareSelection = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0b12',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

// ------------------------------------------------------------------
// Picker de tela/janela
// ------------------------------------------------------------------

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function createScreenPicker(sources) {
  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.focus()
    return
  }

  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null

  pickerWindow = new BrowserWindow({
    width: 1040,
    height: 760,
    minWidth: 820,
    minHeight: 620,
    parent,
    modal: Boolean(parent),
    title: 'Compartilhar tela',
    backgroundColor: '#0b0b12',
    autoHideMenuBar: true,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  })

  const screenSources = sources.filter((source) => source.id?.startsWith('screen:'))
  const windowSources = sources.filter((source) => source.id?.startsWith('window:'))

  const displayIds = new Set(screenSources.map((source) => String(source.display_id || '')))
  const groups = screenSources.map((screen, index) => {
    const displayId = String(screen.display_id || '')
    const windows = windowSources.filter((source) => String(source.display_id || '') === displayId)
    return {
      title: `Tela ${index + 1}`,
      screen,
      windows,
    }
  })

  const unassignedWindows = windowSources.filter((source) => !displayIds.has(String(source.display_id || '')))

  function sourceCard(source, label, type) {
    const thumbnail = source.thumbnail?.toDataURL?.() || ''
    const title = escapeHtml(source.name || label)
    const id = escapeHtml(source.id)
    return `
      <button class="source" data-id="${id}" data-type="${type}" type="button">
        <div class="thumb-wrap">
          ${thumbnail
            ? `<img class="thumb" src="${thumbnail}" alt="" />`
            : '<div class="thumb empty">Sem prévia</div>'}
          <span class="source-badge">${type === 'screen' ? 'TELA INTEIRA' : 'JANELA'}</span>
        </div>
        <div class="source-name" title="${title}">${title}</div>
        <div class="source-action">${type === 'screen' ? 'Transmitir esta tela' : 'Transmitir esta janela'}</div>
      </button>
    `
  }

  const groupsHtml = groups.map((group) => `
    <section class="monitor-section">
      <div class="monitor-header">
        <div>
          <div class="monitor-title">🖥️ ${escapeHtml(group.title)}</div>
          <div class="monitor-subtitle">Escolha a tela inteira ou uma janela que está nela.</div>
        </div>
      </div>
      <div class="grid">
        ${sourceCard(group.screen, group.screen.name || group.title, 'screen')}
        ${group.windows.length
          ? group.windows.map((source) => sourceCard(source, source.name, 'window')).join('')
          : '<div class="no-windows">Nenhuma janela detectada nesta tela.</div>'}
      </div>
    </section>
  `).join('')

  const unassignedHtml = unassignedWindows.length ? `
    <section class="monitor-section">
      <div class="monitor-header">
        <div>
          <div class="monitor-title">🪟 Outras janelas</div>
          <div class="monitor-subtitle">O Windows não informou em qual monitor estas janelas estão.</div>
        </div>
      </div>
      <div class="grid">
        ${unassignedWindows.map((source) => sourceCard(source, source.name, 'window')).join('')}
      </div>
    </section>
  ` : ''

  const pickerHtml = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Compartilhar tela</title>
<style>
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    color: #f5f5f7;
    background: #0b0b12;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  header { margin-bottom: 18px; }
  h1 { margin: 0 0 6px; font-size: 24px; }
  p { margin: 0; color: #a8a8b3; font-size: 14px; }
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    margin-bottom: 18px;
    background: rgba(21,21,30,.96);
    border: 1px solid #2b2b38;
    border-radius: 12px;
  }
  .quality-label { font-size: 13px; font-weight: 700; white-space: nowrap; }
  select {
    min-width: 230px;
    border: 1px solid #3a3948;
    background: #101019;
    color: #f5f5f7;
    border-radius: 8px;
    padding: 9px 12px;
    font-size: 14px;
  }
  .quality-help { color: #858593; font-size: 12px; }
  .monitor-section { margin-bottom: 26px; }
  .monitor-header { margin-bottom: 10px; }
  .monitor-title { font-size: 17px; font-weight: 750; }
  .monitor-subtitle { margin-top: 4px; color: #90909d; font-size: 12px; }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(235px, 1fr));
    gap: 12px;
  }
  .source {
    appearance: none;
    border: 1px solid #2b2b38;
    background: #15151e;
    color: inherit;
    border-radius: 12px;
    padding: 9px;
    text-align: left;
    cursor: pointer;
    transition: border-color .15s, transform .15s, background .15s;
  }
  .source:hover { border-color: #7c5cff; background: #1b1927; transform: translateY(-1px); }
  .source:focus-visible { outline: 2px solid #9b87ff; outline-offset: 2px; }
  .thumb-wrap {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    overflow: hidden;
    background: #09090e;
    border: 1px solid #252532;
  }
  .thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
  .empty { display: grid; place-items: center; color: #777786; font-size: 13px; }
  .source-badge {
    position: absolute;
    left: 7px;
    bottom: 7px;
    padding: 4px 7px;
    border-radius: 5px;
    background: rgba(0,0,0,.72);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: .04em;
  }
  .source-name { margin: 9px 3px 2px; font-size: 14px; font-weight: 650; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  .source-action { margin: 0 3px; color: #9d9dab; font-size: 11px; }
  .no-windows { color: #777786; padding: 18px 0; font-size: 12px; }
  footer { display: flex; justify-content: flex-end; margin-top: 10px; padding-top: 14px; border-top: 1px solid #22222e; }
  .cancel { border: 1px solid #343440; background: #20202a; color: #f5f5f7; border-radius: 8px; padding: 9px 16px; cursor: pointer; }
  .cancel:hover { background: #292934; }
  .empty-state { color: #a8a8b3; padding: 40px 0; text-align: center; }
</style>
</head>
<body>
  <header>
    <h1>Escolha o que compartilhar</h1>
    <p>Primeiro escolha a qualidade. Depois selecione uma tela inteira ou uma janela.</p>
  </header>

  <div class="toolbar">
    <span class="quality-label">Qualidade:</span>
    <select id="quality">
      <option value="1080p60">Alta — 1080p até 60 FPS</option>
      <option value="1080p30" selected>Equilibrada — 1080p até 30 FPS</option>
      <option value="720p30">Economia — 720p até 30 FPS</option>
      <option value="480p30">Baixa — 480p até 30 FPS</option>
    </select>
    <span class="quality-help">Alta usa mais internet. Economia é melhor para conexões lentas.</span>
  </div>

  ${groupsHtml || '<div class="empty-state">Nenhum monitor foi encontrado.</div>'}
  ${unassignedHtml}

  <footer>
    <button class="cancel" id="cancel" type="button">Cancelar</button>
  </footer>

<script>
  const picker = window.talkyDesktopPicker
  const quality = document.getElementById('quality')

  document.querySelectorAll('.source').forEach((button) => {
    button.addEventListener('click', () => {
      picker.selectSource(button.dataset.id, quality.value)
    })
  })

  document.getElementById('cancel').addEventListener('click', () => picker.cancel())
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape') picker.cancel() })
</script>
</body>
</html>`

  pickerWindow.once('closed', () => {
    pickerWindow = null
    if (pendingScreenShare) {
      const { callback } = pendingScreenShare
      pendingScreenShare = null
      callback({})
    }
  })

  pickerWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(pickerHtml)}`)
}

function finishScreenPicker(sourceId, quality = '1080p30') {
  if (!pendingScreenShare) return

  const { sources, callback } = pendingScreenShare
  const source = sources.find((item) => item.id === sourceId)

  if (!source) {
    callback({})
  } else {
    lastScreenShareSelection = {
      sourceId: source.id,
      quality,
      sourceType: source.id?.startsWith('screen:') ? 'screen' : 'window',
      sourceName: source.name || '',
      displayId: String(source.display_id || ''),
    }

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('talky:desktop-source-selected', lastScreenShareSelection)
    }

    callback({
      video: source,
      // O Talky chama getDisplayMedia({ audio: false }), então
      // não habilitamos loopback de áudio aqui.
    })
  }

  pendingScreenShare = null

  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close()
  }
}

function cancelScreenPicker() {
  if (!pendingScreenShare) return

  const { callback } = pendingScreenShare
  pendingScreenShare = null
  callback({})

  if (pickerWindow && !pickerWindow.isDestroyed()) {
    pickerWindow.close()
  }
}

ipcMain.on('talky:desktop-source-selected', (_event, sourceId, quality) => {
  finishScreenPicker(sourceId, quality)
})

ipcMain.handle('talky:get-last-screen-share-selection', () => lastScreenShareSelection)

ipcMain.on('talky:desktop-source-cancel', () => {
  cancelScreenPicker()
})

// ------------------------------------------------------------------
// Permissões
// ------------------------------------------------------------------
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['media', 'display-capture', 'notifications']
    callback(allowed.includes(permission))
  })

  // ----------------------------------------------------------------
  // Compartilhamento de tela:
  // getDisplayMedia() no Electron chega aqui.
  // Em vez de selecionar automaticamente a primeira tela, abrimos
  // um picker com todas as telas e janelas disponíveis.
  // ----------------------------------------------------------------
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    }).then((sources) => {
      if (!sources.length) {
        callback({})
        return
      }

      // Se houver uma requisição anterior pendente, cancela para
      // não deixar callbacks WebRTC presos.
      if (pendingScreenShare) {
        pendingScreenShare.callback({})
        pendingScreenShare = null
      }

      lastScreenShareSelection = null
      pendingScreenShare = { sources, callback }
      createScreenPicker(sources)
    }).catch((error) => {
      console.error('Erro ao obter fontes de compartilhamento:', error)
      callback({})
    })
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
