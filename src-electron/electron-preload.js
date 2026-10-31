/**
 * This file is used specifically for security reasons.
 * Here you can securely expose privileged APIs into the renderer process
 * by leveraging Electron's contextBridge functionality and communicating
 * with the main process through Electron's inter-process communication (IPC).
 *
 * WARNING!
 * The preload script sandboxing offers limited access to a full Node.js environment.
 * Do NOT attempt to import packages from node_modules or use Node.js APIs directly in this file.
 * Instead, use IPC to communicate with the main process and access packages and Node.js
 * functionality there.
 *
 * Preload script documentation:
 * https://www.electronjs.org/docs/latest/tutorial/tutorial-preload
 */

import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { quasarRuntime } from '#q-app/electron/preload'

/**
 * Can be used in the renderer process through `window.quasarRuntime`
 */
contextBridge.exposeInMainWorld('quasarRuntime', quasarRuntime)

/**
 * API проекта: диалоги сохранения/открытия .otr и чтение изображения.
 * В renderer доступно как window.otriProject.
 */
contextBridge.exposeInMainWorld('otriProject', {
  // путь к выбранному пользователем файлу (Electron 32+ убрал File.path)
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  save: (data, filePath) => ipcRenderer.invoke('project:save', { data, filePath }),
  open: () => ipcRenderer.invoke('project:open'),
  readImage: (filePath) => ipcRenderer.invoke('image:read', filePath),
  // команды из меню приложения (Файл → Открыть/Сохранить проект)
  onProjectAction: (callback) => {
    const handler = (_event, action) => callback(action)
    ipcRenderer.on('menu:project-action', handler)
    return () => ipcRenderer.removeListener('menu:project-action', handler)
  }
})
