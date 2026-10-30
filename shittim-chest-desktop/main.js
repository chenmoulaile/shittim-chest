/**
 * SHITTIM CHEST 桌面版 —— Electron 主进程
 * 加载本地 dist 构建产物，完全离线运行，不发起任何远程请求
 */
const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('node:path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    backgroundColor: '#0b1526',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 本地内容包通过相对路径 fetch（file:// 协议），需关闭同源限制；应用本身不加载任何远程内容
      webSecurity: false,
      spellcheck: false,
    },
  })

  win.loadFile(path.join(__dirname, 'dist', 'index.html'))
  win.once('ready-to-show', () => win.show())

  // 外部链接交给系统浏览器，不新建应用内窗口
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}

function switchToChineseMenu(win) {
  try {
    const menu = Menu.buildFromTemplate([
      {
        label: 'SHITTIM CHEST',
        submenu: [
          { label: '关于', click: () => win.show() },
          { type: 'separator' },
          { label: '退出', accelerator: 'Ctrl+Q', click: () => app.quit() },
        ],
      },
      {
        label: '视图',
        submenu: [
          { role: 'reload', label: '重新加载' },
          { role: 'forceReload', label: '强制重新加载' },
          { type: 'separator' },
          { role: 'zoomIn', label: '放大' },
          { role: 'zoomOut', label: '缩小' },
          { role: 'resetZoom', label: '重置缩放' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: '全屏' },
        ],
      },
    ])
    Menu.setApplicationMenu(menu)
  } catch {
    /* 非 Windows 环境忽略 */
  }
}

app.whenReady().then(() => {
  const win = createWindow()
  switchToChineseMenu(win)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
