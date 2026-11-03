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

const PROJECT_EXTENSION = '.otr'
const PROJECT_OPEN_CHANNEL = 'project:open-request'
const SETTINGS_FILE = 'settings.json'

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

let mainWindow = null
// рендерер сообщает о готовности, когда страница смонтирована и может
// принять проект; до этого файл ждёт в pendingProject
let rendererReady = false
let pendingProject = null
let openingProject = false
// подтверждение закрытия: пока рендерер не ответил, окно не закрываем
let allowClose = false
let closeRequestPending = false

function sendProjectAction (action) {
  const win =
    BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (win) win.webContents.send('menu:project-action', action)
}

// Файл настроек приложения (каталог переменных описания и т.п.).
function settingsFilePath () {
  return path.join(app.getPath('userData'), SETTINGS_FILE)
}

function focusMainWindow () {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

// Путь к .otr из аргументов командной строки: так файл приходит при запуске
// через ассоциацию, «Открыть с помощью» и при повторном запуске приложения.
function findProjectPathInArgv (argv) {
  for (const arg of argv) {
    if (typeof arg !== 'string' || arg.length === 0) continue
    if (arg.startsWith('-')) continue
    if (path.extname(arg).toLowerCase() === PROJECT_EXTENSION) {
      return path.resolve(arg)
    }
  }
  return null
}

async function readProjectFile (filePath) {
  if (path.extname(filePath).toLowerCase() !== PROJECT_EXTENSION) {
    throw new Error('файл не является проектом Otri (.otr)')
  }

  let text
  try {
    text = await fs.readFile(filePath, 'utf8')
  } catch (err) {
    throw new Error(`не удалось прочитать файл: ${err.message}`, { cause: err })
  }

  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('файл повреждён или не является проектом Otri')
  }

  if (!data || data.format !== 'otri-project') {
    throw new Error('неверный формат файла проекта')
  }
  return data
}

// Прочитать отложенный проект и отдать его рендереру.
async function flushPendingProject () {
  if (openingProject) return
  const pending = pendingProject
  if (!pending || !rendererReady) return
  if (!mainWindow || mainWindow.isDestroyed()) return

  pendingProject = null
  openingProject = true
  try {
    const data = await readProjectFile(pending.filePath)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(PROJECT_OPEN_CHANNEL, {
        filePath: pending.filePath,
        data,
        isDefault: pending.isDefault
      })
    }
  } catch (err) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(PROJECT_OPEN_CHANNEL, {
        filePath: pending.filePath,
        error: err.message,
        isDefault: pending.isDefault
      })
    }
  } finally {
    openingProject = false
    focusMainWindow()
    // пока читали файл, мог прийти ещё один
    if (pendingProject) await flushPendingProject()
  }
}

// Открыть проект, переданный системе (двойной клик по .otr и т.п.).
function requestProjectOpen (filePath, isDefault = false) {
  if (!filePath) return
  pendingProject = { filePath, isDefault }
  void flushPendingProject()
}

// Проект по умолчанию открывается при старте без переданного файла.
// В сборке он лежит рядом с index.html (внутри app.asar), в dev-режиме — в public/.
async function resolveDefaultProjectPath () {
  const candidates = [
    path.join(app.getAppPath(), 'default.otr'),
    path.join(app.getAppPath(), 'public', 'default.otr'),
    // dev-режим: Electron запускается из каталога проекта
    path.join(process.cwd(), 'public', 'default.otr')
  ]
  for (const candidate of candidates) {
    try {
      await fs.access(candidate)
      return candidate
    } catch {
      // пробуем следующий вариант
    }
  }
  return null
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
    const data = await readProjectFile(filePath)
    return { canceled: false, filePath, data }
  })

  // Рендерер смонтирован и готов принять проект, открытый извне.
  ipcMain.handle('project:renderer-ready', () => {
    rendererReady = true
    void flushPendingProject()
  })

  // Ответ рендерера на запрос закрытия: можно ли закрывать окно.
  ipcMain.handle('app:close-response', (event, allow) => {
    closeRequestPending = false
    if (allow !== true) return
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    allowClose = true
    win.close()
  })

  // Нативное подтверждение сохранения изменений при закрытии.
  ipcMain.handle('app:confirm-close', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const res = await dialog.showMessageBox(win, {
      type: 'question',
      title: 'Несохранённые изменения',
      message: 'Сохранить изменения проекта перед закрытием?',
      detail: 'Если не сохранить, изменения будут потеряны.',
      buttons: ['Сохранить', 'Не сохранять', 'Отмена'],
      defaultId: 0,
      cancelId: 2,
      noLink: true
    })
    return ['save', 'discard', 'cancel'][res.response] || 'cancel'
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

  // Настройки приложения: читаем/пишем JSON-файл в userData.
  ipcMain.handle('settings:read', async () => {
    try {
      const text = await fs.readFile(settingsFilePath(), 'utf8')
      return JSON.parse(text)
    } catch {
      return null
    }
  })

  ipcMain.handle('settings:write', async (event, data) => {
    const target = settingsFilePath()
    await fs.mkdir(path.dirname(target), { recursive: true })
    await fs.writeFile(target, JSON.stringify(data, null, 2), 'utf8')
    return true
  })

  ipcMain.handle('settings:path', () => settingsFilePath())
}

async function createWindow () {
  /**
   * Initial window options
   */
  const win = new BrowserWindow({
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
  mainWindow = win
  rendererReady = false
  allowClose = false
  closeRequestPending = false

  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })

  // Перед закрытием спрашиваем рендерер о несохранённых изменениях.
  // Если страница ещё не готова, закрываем сразу.
  win.on('close', (event) => {
    if (allowClose || !rendererReady) return
    event.preventDefault()
    if (closeRequestPending) return
    closeRequestPending = true
    win.webContents.send('app:close-request')
  })

  // после перезагрузки страница снова сообщит о готовности
  win.webContents.on('did-start-loading', () => {
    rendererReady = false
  })

  // не даём перетащенному в окно файлу увести приложение на file://
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) event.preventDefault()
  })

  if (import.meta.env.QUASAR_DEV) {
    await win.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await win.loadFile('index.html')
  }

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    win.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
  }
}

// Один экземпляр приложения: второй запуск не создаёт новое окно, а передаёт
// файл уже работающему приложению (двойной клик по .otr в Проводнике).
// В dev-режиме блокировку не берём, чтобы не конфликтовать с установленной копией.
const singleInstanceLock = import.meta.env.QUASAR_DEV
  ? true
  : app.requestSingleInstanceLock()

if (!singleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const filePath = findProjectPathInArgv(argv)
    if (filePath) requestProjectOpen(filePath)
    else focusMainWindow()
  })

  // macOS: файл приходит событием, а не аргументом командной строки.
  app.on('open-file', (event, filePath) => {
    event.preventDefault()
    if (app.isReady()) requestProjectOpen(filePath)
    else pendingProject = { filePath, isDefault: false }
  })

  void app.whenReady().then(async () => {
    const initialProjectPath = findProjectPathInArgv(process.argv.slice(1))
    if (initialProjectPath) {
      pendingProject = { filePath: initialProjectPath, isDefault: false }
    } else if (!pendingProject) {
      // без аргумента открываем проект по умолчанию
      const defaultProjectPath = await resolveDefaultProjectPath()
      if (defaultProjectPath) {
        pendingProject = { filePath: defaultProjectPath, isDefault: true }
      }
    }
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
}
