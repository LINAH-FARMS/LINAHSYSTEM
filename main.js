const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'LOGO.png'),
    title: 'لينة فارمز — نظام إداري متكامل',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Build menu
  const menuTemplate = [
    {
      label: 'ملف',
      submenu: [
        { label: 'فتح النسخة الاحتياطية', accelerator: 'Ctrl+O', click: () => openBackup() },
        { label: 'تصدير البيانات (JSON)', accelerator: 'Ctrl+E', click: () => exportAllData() },
        { type: 'separator' },
        { label: 'طباعة', accelerator: 'Ctrl+P', click: () => mainWindow.webContents.print() },
        { type: 'separator' },
        { label: 'إنهاء', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'عرض',
      submenu: [
        { label: 'تكبير', accelerator: 'F11', role: 'togglefullscreen' },
        { label: 'تصغير', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: 'تكبير العرض', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: 'إعادة الحجم', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'أدوات المطور', accelerator: 'F12', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'مساعدة',
      submenu: [
        {
          label: 'فتح مجلد البيانات',
          click: () => {
            try {
              const userDataPath = app.getPath('userData');
              shell.openPath(userDataPath);
            } catch(e) { console.error(e); }
          }
        },
        { type: 'separator' },
        { label: 'حول النظام', click: () => {
          dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'حول لينة فارمز',
            message: 'لينة فارمز — نظام إداري متكامل',
            detail: `الإصدار: 1.0.0\n\nنظام إداري متكامل لإدارة القوة العاملة، السكن، المخازن، الوجبات، المخبز، الصيانة، والمالية.\n\nجميع الحقوق محفوظة © ${new Date().getFullYear()}`
          });
        }}
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => { mainWindow = null; });
}

function openBackup() {
  dialog.showOpenDialog(mainWindow, {
    title: 'فتح النسخة الاحتياطية',
    filters: [{ name: 'JSON Backup', extensions: ['json'] }],
    properties: ['openFile']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      mainWindow.webContents.send('open-backup', result.filePaths[0]);
    }
  }).catch(console.error);
}

function exportAllData() {
  dialog.showSaveDialog(mainWindow, {
    title: 'تصدير جميع البيانات',
    defaultPath: `linah_backup_${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      mainWindow.webContents.send('export-all-data', result.filePath);
    }
  }).catch(console.error);
}

// IPC: Save exported data
ipcMain.on('save-file', (event, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'تم الحفظ',
      message: 'تم حفظ الملف بنجاح'
    });
  } catch(e) {
    dialog.showErrorBox('خطأ في الحفظ', e.message);
  }
});

// IPC: Read backup file
ipcMain.on('read-backup', (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    event.returnValue = data;
  } catch(e) {
    dialog.showErrorBox('خطأ في القراءة', e.message);
    event.returnValue = null;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
