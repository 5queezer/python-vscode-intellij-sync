"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const os = require("os");
suite('Python Debug Config Sync Tests', () => {
    let testWorkspace;
    setup(async () => {
        testWorkspace = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        // Create test directories
        fs.mkdirSync(path.join(testWorkspace, '.vscode'), { recursive: true });
        fs.mkdirSync(path.join(testWorkspace, '.idea'), { recursive: true });
        // Copy test launch.json
        const launchJson = {
            "version": "0.2.0",
            "configurations": [
                {
                    "name": "Python: Current File",
                    "type": "python",
                    "request": "launch",
                    "program": "${workspaceFolder}/main.py",
                    "args": ["--debug"],
                    "env": { "DEBUG": "true" },
                    "cwd": "${workspaceFolder}"
                },
                {
                    "name": "Python: Module",
                    "type": "python",
                    "request": "launch",
                    "module": "myapp.cli"
                }
            ]
        };
        fs.writeFileSync(path.join(testWorkspace, '.vscode', 'launch.json'), JSON.stringify(launchJson, null, 2));
    });
    teardown(() => {
        if (fs.existsSync(testWorkspace)) {
            fs.rmSync(testWorkspace, { recursive: true, force: true });
        }
    });
    test('Should sync Python program config to IntelliJ XML', async () => {
        // Mock workspace
        const workspaceFolder = { uri: { fsPath: testWorkspace } };
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [workspaceFolder],
            configurable: true
        });
        // Execute sync command
        await vscode.commands.executeCommand('pythonDebugSync.sync');
        // Verify XML files were created
        const runConfigsPath = path.join(testWorkspace, '.idea', 'runConfigurations');
        const files = fs.readdirSync(runConfigsPath);
        assert.strictEqual(files.length, 2);
        assert.ok(files.includes('Python__Current_File.xml'));
        assert.ok(files.includes('Python__Module.xml'));
    });
    test('Should generate correct XML for program-based config', async () => {
        const workspaceFolder = { uri: { fsPath: testWorkspace } };
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [workspaceFolder],
            configurable: true
        });
        await vscode.commands.executeCommand('pythonDebugSync.sync');
        const xmlPath = path.join(testWorkspace, '.idea', 'runConfigurations', 'Python__Current_File.xml');
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        // Check key elements
        assert.ok(xmlContent.includes('name="Python: Current File"'));
        assert.ok(xmlContent.includes('SCRIPT_NAME" value="${workspaceFolder}/main.py"'));
        assert.ok(xmlContent.includes('PARAMETERS" value="--debug"'));
        assert.ok(xmlContent.includes('MODULE_MODE" value="false"'));
        assert.ok(xmlContent.includes('env name="DEBUG" value="true"'));
    });
    test('Should generate correct XML for module-based config', async () => {
        const workspaceFolder = { uri: { fsPath: testWorkspace } };
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [workspaceFolder],
            configurable: true
        });
        await vscode.commands.executeCommand('pythonDebugSync.sync');
        const xmlPath = path.join(testWorkspace, '.idea', 'runConfigurations', 'Python__Module.xml');
        const xmlContent = fs.readFileSync(xmlPath, 'utf8');
        // Check module-specific elements
        assert.ok(xmlContent.includes('name="Python: Module"'));
        assert.ok(xmlContent.includes('MODULE_NAME" value="myapp.cli"'));
        assert.ok(xmlContent.includes('MODULE_MODE" value="true"'));
    });
    test('Should handle malformed JSON gracefully', async () => {
        // Create invalid JSON
        fs.writeFileSync(path.join(testWorkspace, '.vscode', 'launch.json'), '{ "invalid": json, }');
        const workspaceFolder = { uri: { fsPath: testWorkspace } };
        Object.defineProperty(vscode.workspace, 'workspaceFolders', {
            value: [workspaceFolder],
            configurable: true
        });
        // Should not throw, but show error message
        await vscode.commands.executeCommand('pythonDebugSync.sync');
        // Verify no XML files were created
        const runConfigsPath = path.join(testWorkspace, '.idea', 'runConfigurations');
        const files = fs.readdirSync(runConfigsPath);
        assert.strictEqual(files.length, 0);
    });
    test('Should sanitize config names for filenames', () => {
        const { sanitizeFileName } = require('../extension');
        assert.strictEqual(sanitizeFileName('Test<Config>'), 'Test_Config_');
        assert.strictEqual(sanitizeFileName('My/Config:Name'), 'My_Config_Name');
        assert.strictEqual(sanitizeFileName('Normal Name'), 'Normal Name');
    });
});
//# sourceMappingURL=extenson.test.js.map