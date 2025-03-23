//const { app, BrowserWindow, ipcMain } = require('electron');
//const fs = require('fs').promises;
//const path = require('path');
//const { exec } = require('child_process');

//const userDataPath = app.getPath('userData');
//const configFilePath = path.join(userDataPath, 'userConfig.json');

//const backendPath = app.isPackaged
//    ? path.join(process.resourcesPath, 'backend')
//    : path.join(__dirname, '../../backend');

//const pythonPath = app.isPackaged
//    ? path.join(process.resourcesPath, 'backend/python/python.exe')
//    : path.join(backendPath, 'venv/Scripts/python.exe');

//let backendProcess;

//async function getServerConfig() {
//    try {
//        const data = await fs.readFile(configFilePath, 'utf-8');
//        const config = JSON.parse(data);
//        const serverIP = config.serverIPs && config.serverIPs.length > 0 ? config.serverIPs[0] : '192.168.1.116:8000';
//        const [host, port] = serverIP.split(':');
//        return { host: host || '192.168.1.116', port: port || '8000' };
//    } catch (error) {
//        console.error('Lỗi khi đọc cấu hình server:', error);
//        return { host: '192.168.1.116', port: '8000' };
//    }
//}

//async function startBackend() {
//    const { host, port } = await getServerConfig();
//    console.log(`Starting FastAPI backend on ${host}:${port}...`);
//    const uvicornCommand = `"${pythonPath}" -m uvicorn main:app --host ${host} --port ${port}`;

//    backendProcess = exec(uvicornCommand, { cwd: backendPath }, (error, stdout, stderr) => {
//        if (error) {
//            console.error(`Error starting backend: ${error.message}`);
//            return;
//        }
//        if (stderr) {
//            console.error(`Backend stderr: ${stderr}`);
//            return;
//        }
//        console.log(`Backend stdout: ${stdout}`);
//    });

//    backendProcess.on('close', (code) => {
//        console.log(`Backend process exited with code ${code}`);
//    });
//}

//ipcMain.handle('load-config', async () => {
//    try {
//        const data = await fs.readFile(configFilePath, 'utf-8');
//        return JSON.parse(data);
//    } catch (error) {
//        console.error('Lỗi khi đọc tệp cấu hình:', error);
//        return null;
//    }
//});

//ipcMain.handle('save-config', async (event, config) => {
//    try {
//        await fs.writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
//        return true;
//    } catch (error) {
//        console.error('Lỗi khi lưu cấu hình:', error);
//        return false;
//    }
//});

//let mainWindow;

//function createWindow() {
//    mainWindow = new BrowserWindow({
//        width: 800,
//        height: 600,
//        webPreferences: {
//            nodeIntegration: false,
//            contextIsolation: true,
//            preload: path.join(__dirname, 'preload.js')
//        }
//    });

//    if (app.isPackaged) {
//        const indexPath = path.join(__dirname, '../../dist/index.html');
//        mainWindow.loadFile(indexPath).catch((err) => {
//            console.error('Lỗi khi tải index.html:', err);
//        });
//        mainWindow.webContents.openDevTools();
//    } else {
//        mainWindow.loadURL('http://localhost:5173');
//        mainWindow.webContents.openDevTools();
//    }

//    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
//        console.error(`Lỗi tải trang: ${errorCode} - ${errorDescription}`);
//    });

//    mainWindow.webContents.on('did-finish-load', () => {
//        console.log('Trang đã tải xong');
//    });
//}

//app.whenReady().then(async () => {
//    try {
//        const exists = await fs.access(configFilePath).then(() => true).catch(() => false);
//        if (!exists) {
//            await fs.writeFile(configFilePath, JSON.stringify({
//                serverIPs: ['192.168.1.116:8000'],
//                khu4Config: { rows: 4, columns: 4, cells: 16 },
//                khu5Config: { rows: 4, columns: 4, cells: 16 },
//                activeKhu: 'khu4',
//                gridData: { khu4: [], khu5: [] }
//            }, null, 2), 'utf-8');
//            console.log('Tạo file userConfig.json mặc định thành công');
//        }
//    } catch (error) {
//        console.error('Lỗi khi tạo file userConfig.json mặc định:', error);
//    }

//    startBackend();
//    createWindow();

//    app.on('activate', () => {
//        if (BrowserWindow.getAllWindows().length === 0) {
//            createWindow();
//        }
//    });
//});

//app.on('window-all-closed', () => {
//    if (process.platform !== 'darwin') {
//        if (backendProcess) {
//            backendProcess.kill();
//        }
//        app.quit();
//    }
//});

//app.on('before-quit', async () => {
//    if (backendProcess) {
//        backendProcess.kill();
//    }
//});

const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            enableRemoteModule: false,
        },
    });

    // Đảm bảo đường dẫn đến dist/index.html
    const startUrl = `file://${path.join(__dirname, '../../dist/index.html')}`;
    console.log('Loading URL:', startUrl); // Debug URL
    mainWindow.loadURL(startUrl);

    mainWindow.webContents.openDevTools(); // Mở DevTools để debug

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Đảm bảo thư mục userData tồn tại
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'userConfig.json');
    if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
    }
    if (!fs.existsSync(configPath)) {
        fs.writeFileSync(configPath, JSON.stringify({}));
    }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});