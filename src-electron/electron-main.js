import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from '#q-app/electron/main'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

const IMAGE_MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.tif': 'image/tiff',
  '.tiff': 'image/tiff'
}

function sendProjectAction (action) {
  const win =
    BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win) win.webContents.send('menu:project-action', action)
}

// Меню приложения: пункты «Файл» дублируют кнопки сохранения/открытия
// проекта, которые находятся в шапке приложения.
function buildAppMenu () {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label: 'Открыть проект…',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendProjectAction('open')
        },
        {
          label: 'Сохранить проект…',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendProjectAction('save')
        },
        { type: 'separator' },
        { role: 'quit', label: 'Выход' }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function registerProjectIpc () {
  // Сохранение проекта: данные приходят готовым JSON-объектом из рендерера.
  ipcMain.handle('project:save', async (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const data = payload && payload.data
    if (!data) return { canceled: true }

    let target = payload.filePath
    if (!target) {
      const res = await dialog.showSaveDialog(win, {
        title: 'Сохранить проект Otri',
        defaultPath: 'project.otr',
        filters: [{ name: 'Проект Otri', extensions: ['otr'] }]
      })
      if (res.canceled || !res.filePath) return { canceled: true }
      target = res.filePath
    }
    // гарантируем расширение .otr
    if (path.extname(target).toLowerCase() !== '.otr') target += '.otr'

    await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8')
    return { canceled: false, filePath: target }
  })

  ipcMain.handle('project:open', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const res = await dialog.showOpenDialog(win, {
      title: 'Открыть проект Otri',
      filters: [{ name: 'Проект Otri', extensions: ['otr'] }],
      properties: ['openFile']
    })
    if (res.canceled || !res.filePaths.length) return { canceled: true }

    const filePath = res.filePaths[0]
    const text = await fs.readFile(filePath, 'utf8')
    return { canceled: false, filePath, data: JSON.parse(text) }
  })

  // Чтение изображения проекта в data URL, чтобы оно стабильно грузилось
  // и в dev-режиме, и в собранном приложении.
  ipcMain.handle('image:read', async (event, filePath) => {
    if (!filePath || typeof filePath !== 'string') return null
    const mime = IMAGE_MIME[path.extname(filePath).toLowerCase()] || 'image/png'
    const buf = await fs.readFile(filePath)
    return {
      name: path.basename(filePath),
      dataUrl: `data:${mime};base64,${buf.toString('base64')}`
    }
  })
}

async function createWindow () {
  /**
   * Initial window options
   */
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'), // Windows and Linux
    width: 1200,
    height: 1200,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }
}

void app.whenReady().then(() => {
  registerQuasarRuntime()
  registerProjectIpc()
  buildAppMenu()
  void createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})
