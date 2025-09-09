"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const jsonc_parser_1 = require("jsonc-parser");
function activate(context) {
    let disposable = vscode.commands.registerCommand('pythonDebugSync.sync', async () => {
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
            const launchContent = fs.readFileSync(launchPath, 'utf8');
            let launchConfig;
            try {
                // Parse JSON with comments support
                launchConfig = (0, jsonc_parser_1.parse)(launchContent);
            }
            catch (parseError) {
                vscode.window.showErrorMessage(`Invalid JSON in launch.json: ${parseError}`);
                return;
            }
            // Support both 'python' and 'debugpy' types
            const pythonConfigs = launchConfig.configurations?.filter((c) => c.type === 'debugpy' || c.type === 'python');
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
                    const xml = generateIntelliJConfig(config);
                    const fileName = `${sanitizeFileName(config.name)}.xml`;
                    fs.writeFileSync(path.join(ideaPath, fileName), xml);
                    syncedCount++;
                }
            }
            vscode.window.showInformationMessage(`Synced ${syncedCount} Python debug configurations to IntelliJ`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Sync failed: ${error}`);
        }
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;
function generateIntelliJConfig(config) {
    const isModule = config.module;
    const scriptPath = config.program || '';
    const args = config.args?.join(' ') || '';
    const env = config.env || {};
    const cwd = config.cwd || '';
    let envXml = '';
    for (const [key, value] of Object.entries(env)) {
        envXml += `    <env name="${key}" value="${value}" />\n`;
    }
    return `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="${config.name}" type="PythonConfigurationType" factoryName="Python">
    <module name="" />
    <option name="INTERPRETER_OPTIONS" value="" />
    <option name="PARENT_ENVS" value="true" />
    <envs>
${envXml}    </envs>
    <option name="SDK_HOME" value="" />
    <option name="WORKING_DIRECTORY" value="${cwd}" />
    <option name="IS_MODULE_SDK" value="true" />
    <option name="ADD_CONTENT_ROOTS" value="true" />
    <option name="ADD_SOURCE_ROOTS" value="true" />
    ${isModule
        ? `<EXTENSION ID="PythonCoverageRunConfigurationExtension" runner="coverage.py" />
    <option name="SCRIPT_NAME" value="" />
    <option name="CLASS_NAME" value="" />
    <option name="METHOD_NAME" value="" />
    <option name="FOLDER_NAME" value="" />
    <option name="MODULE_NAME" value="${config.module}" />`
        : `<option name="SCRIPT_NAME" value="${scriptPath}" />`}
    <option name="PARAMETERS" value="${args}" />
    <option name="SHOW_COMMAND_LINE" value="false" />
    <option name="EMULATE_TERMINAL" value="false" />
    <option name="MODULE_MODE" value="${isModule ? 'true' : 'false'}" />
    <option name="REDIRECT_INPUT" value="false" />
    <option name="INPUT_FILE" value="" />
    <method v="2" />
  </configuration>
</component>`;
}
function sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '_');
}
function deactivate() { }
exports.deactivate = deactivate;
// Export for testing
module.exports = { sanitizeFileName };
//# sourceMappingURL=extension.js.map