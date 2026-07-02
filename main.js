const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    win.loadFile('index.html');
}

app.whenReady().then(createWindow);

ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });
    return canceled ? null : filePaths[0];
});

ipcMain.on('start-playwright', (event, userExcelPath) => {
    // 1. Point directly to the bundled Playwright CLI inside your packaged app
    const playwrightCli = path.join(__dirname, 'node_modules', '@playwright', 'test', 'cli.js');

    console.log("\n--- STARTING PLAYWRIGHT ---");
    console.log("Using Excel Path:", userExcelPath);

    // 2. Use process.execPath (Electron's executable) and force it to run as pure Node.js
    const playwrightProcess = spawn(process.execPath, [playwrightCli, 'test'], {
        cwd: __dirname,
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: '1', // <--- CRITICAL FIX: Forces Electron to act as a Node runner
            USER_EXCEL_PATH: userExcelPath
        }
    });

    let fullLog = ""; // Track EVERYTHING so it can't hide

    // 1. THIS PRINTS STANDARD OUTPUT TO VS CODE AND UI
    playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString();
        fullLog += output + "\n"; // Save everything to the log
        console.log(output);

        const lines = output.split('\n');
        lines.forEach(line => {
            if (line.includes('UI_UPDATE|')) {
                const parts = line.trim().split('|');
                event.reply('update-ui-table', {
                    status: parts[1],
                    index: parts[2],
                    name: parts[3],
                    details: parts[4] || ''
                });
            }
        });
    });

    // 2. THIS CAPTURES FATAL ERRORS
    playwrightProcess.stderr.on('data', (data) => {
        fullLog += data.toString() + "\n"; // Save errors to the log
        console.error("PLAYWRIGHT ERROR:", data.toString());
    });

    playwrightProcess.on('close', (code) => {
        console.log(`\n--- PLAYWRIGHT FINISHED (Exit Code: ${code}) ---`);

        // IF IT CRASHES (Code is not 0 AND not 1), SHOW A GIANT ERROR POPUP
        // Code 0 = All passed. Code 1 = Some failed (normal testing). Other codes = System Crash.
        if (code !== 0 && code !== 1 && code !== null) {
            dialog.showErrorBox(
                "Automation Crashed",
                `The background process failed (Exit Code: ${code}).\n\nReal Error Log:\n${fullLog}`
            );
        }

        event.reply('playwright-done');
    });
});