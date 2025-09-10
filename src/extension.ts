import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'jsonc-parser';
import { generateIntelliJConfig, sanitizeFileName } from './xmlGenerator';
import { extractSDKFromWorkspaceSync } from './workspaceParser';
import { IntelliJConfigParser } from './intellijParser';
import { LaunchJsonGenerator } from './launchJsonGenerator';
import { VSCodeLaunchConfig, LaunchConfig } from './types';

export function activate(context: vscode.ExtensionContext) {
    // Register command for VS Code -> IntelliJ sync
    let disposableToIntelliJ = vscode.commands.registerCommand('pythonDebugSync.sync', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const launchPath = path.join(workspaceFolder.uri.fsPath, '.vscode', 'launch.json');
        const ideaPath = path.join(workspaceFolder.uri.fsPath, '.idea', 'runConfigurations');

        if (!fs.existsSync(launchPath)) {
            vscode.window.showErrorMessage('No launch.json found');
            return;
        }

        try {
            // Get Python interpreter path from VSCode settings
            const pythonConfig = vscode.workspace.getConfiguration('python');
            const pythonPath = pythonConfig.get<string>('defaultInterpreterPath') ||
                              pythonConfig.get<string>('pythonPath') ||
                              'python';

            // Extract SDK information from workspace
            const sdkInfo = extractSDKFromWorkspaceSync(workspaceFolder.uri.fsPath);

            const launchContent = fs.readFileSync(launchPath, 'utf8');
            let launchConfig: LaunchConfig;

            try {
                // Parse JSON with comments support
                launchConfig = parse(launchContent);
            } catch (parseError) {
                vscode.window.showErrorMessage(`Invalid JSON in launch.json: ${parseError}`);
                return;
            }

            // Support both 'python' and 'debugpy' types
            const pythonConfigs = launchConfig.configurations?.filter((c: VSCodeLaunchConfig) => c.type === 'debugpy' || c.type === 'python');

            if (!pythonConfigs?.length) {
                vscode.window.showWarningMessage('No Python debug configurations found');
                return;
            }

            if (!fs.existsSync(ideaPath)) {
                fs.mkdirSync(ideaPath, { recursive: true });
            }

            let syncedCount = 0;
            for (const config of pythonConfigs) {
                if (config.request === 'launch' && (config.program || config.module)) {
                    const xml = generateIntelliJConfig(config, pythonPath, sdkInfo.sdkName);
                    const fileName = `${sanitizeFileName(config.name)}.xml`;
                    fs.writeFileSync(path.join(ideaPath, fileName), xml);
                    syncedCount++;
                }
            }

            vscode.window.showInformationMessage(`Synced ${syncedCount} Python debug configurations to IntelliJ`);
        } catch (error) {
            vscode.window.showErrorMessage(`Sync failed: ${error}`);
        }
    });

    // Register command for IntelliJ -> VS Code sync
    let disposableFromIntelliJ = vscode.commands.registerCommand('pythonDebugSync.syncFromIntelliJ', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }

        const ideaPath = path.join(workspaceFolder.uri.fsPath, '.idea');
        
        if (!fs.existsSync(ideaPath)) {
            vscode.window.showErrorMessage('No .idea folder found. Make sure this is an IntelliJ project.');
            return;
        }

        try {
            // Parse IntelliJ configurations
            const parser = new IntelliJConfigParser(workspaceFolder.uri.fsPath);
            const intellijConfigs = parser.extractAllPythonConfigsSync();

            if (!intellijConfigs.length) {
                vscode.window.showWarningMessage('No Python run configurations found in IntelliJ project');
                return;
            }

            // Generate VS Code launch.json
            const generator = new LaunchJsonGenerator(workspaceFolder.uri.fsPath);
            const syncedCount = await generator.syncToLaunchJson(intellijConfigs);

            vscode.window.showInformationMessage(`Synced ${syncedCount} Python debug configurations from IntelliJ to VS Code`);
        } catch (error) {
            vscode.window.showErrorMessage(`Sync from IntelliJ failed: ${error}`);
        }
    });

    context.subscriptions.push(disposableToIntelliJ, disposableFromIntelliJ);
}


export function deactivate() { }
