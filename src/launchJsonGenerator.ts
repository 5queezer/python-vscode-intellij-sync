import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'jsonc-parser';
import { ParsedIntelliJConfig, VSCodeLaunchConfig, LaunchConfig } from './types';

/**
 * Generates VS Code launch.json configurations from IntelliJ run configurations
 */
export class LaunchJsonGenerator {
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
    }

    /**
     * Converts IntelliJ configurations to VS Code launch configurations
     * and merges them with existing launch.json while preserving existing configs
     */
    async syncToLaunchJson(intellijConfigs: ParsedIntelliJConfig[]): Promise<number> {
        const launchPath = path.join(this.workspacePath, '.vscode', 'launch.json');
        
        // Convert IntelliJ configs to VS Code format
        const vsCodeConfigs = intellijConfigs.map(config => this.convertToVSCodeConfig(config));
        
        // Load existing launch.json or create new one
        let existingLaunchConfig: LaunchConfig;
        
        if (fs.existsSync(launchPath)) {
            try {
                const existingContent = fs.readFileSync(launchPath, 'utf8');
                existingLaunchConfig = parse(existingContent);
            } catch (error) {
                console.warn(`Failed to parse existing launch.json: ${error}`);
                existingLaunchConfig = { configurations: [] };
            }
        } else {
            existingLaunchConfig = { configurations: [] };
        }

        // Merge configurations
        const mergedConfig = this.mergeConfigurations(existingLaunchConfig, vsCodeConfigs);
        
        // Ensure .vscode directory exists
        const vscodeDir = path.dirname(launchPath);
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // Write the merged configuration
        const jsonString = this.formatLaunchJson(mergedConfig);
        fs.writeFileSync(launchPath, jsonString, 'utf8');

        return vsCodeConfigs.length;
    }

    /**
     * Converts a single IntelliJ configuration to VS Code format
     */
    private convertToVSCodeConfig(intellijConfig: ParsedIntelliJConfig): VSCodeLaunchConfig {
        const vsCodeConfig: VSCodeLaunchConfig = {
            name: intellijConfig.name,
            type: 'debugpy',
            request: intellijConfig.attachMode ? 'attach' : 'launch'
        };

        if (intellijConfig.attachMode) {
            // Handle attach mode configuration
            this.configureAttachMode(vsCodeConfig, intellijConfig);
        } else {
            // Handle launch mode configuration
            this.configureLaunchMode(vsCodeConfig, intellijConfig);
        }

        // Add common debugging properties
        this.addCommonDebugProperties(vsCodeConfig, intellijConfig);

        return vsCodeConfig;
    }

    /**
     * Configures attach mode specific properties
     */
    private configureAttachMode(vsCodeConfig: VSCodeLaunchConfig, intellijConfig: ParsedIntelliJConfig): void {
        // Set connection details
        if (intellijConfig.attachHost && intellijConfig.attachPort) {
            vsCodeConfig.connect = {
                host: intellijConfig.attachHost,
                port: intellijConfig.attachPort
            };
            // Also set individual properties for compatibility
            vsCodeConfig.host = intellijConfig.attachHost;
            vsCodeConfig.port = intellijConfig.attachPort;
        } else {
            // Default attach configuration
            vsCodeConfig.host = intellijConfig.attachHost || 'localhost';
            vsCodeConfig.port = intellijConfig.attachPort || 5678;
            vsCodeConfig.connect = {
                host: vsCodeConfig.host,
                port: vsCodeConfig.port
            };
        }

        // Handle path mappings for remote debugging
        if (intellijConfig.pathMappings && intellijConfig.pathMappings.length > 0) {
            vsCodeConfig.pathMappings = intellijConfig.pathMappings.map(mapping => ({
                localRoot: this.resolveIntelliJPath(mapping.localRoot),
                remoteRoot: mapping.remoteRoot
            }));
        } else {
            // Default path mapping for local attach
            vsCodeConfig.pathMappings = [{
                localRoot: '${workspaceFolder}',
                remoteRoot: '.'
            }];
        }

        // Set attach-specific debugging options
        if (intellijConfig.redirectOutput !== undefined) {
            vsCodeConfig.redirectOutput = intellijConfig.redirectOutput;
        }
    }

    /**
     * Configures launch mode specific properties
     */
    private configureLaunchMode(vsCodeConfig: VSCodeLaunchConfig, intellijConfig: ParsedIntelliJConfig): void {
        // Handle module vs script execution
        if (intellijConfig.moduleMode && intellijConfig.moduleName) {
            vsCodeConfig.module = intellijConfig.moduleName;
        } else if (intellijConfig.scriptName) {
            vsCodeConfig.program = this.resolveIntelliJPath(intellijConfig.scriptName);
        }

        // Handle command line arguments
        if (intellijConfig.parameters) {
            vsCodeConfig.args = this.parseCommandLineArgs(intellijConfig.parameters);
        }

        // Handle working directory
        if (intellijConfig.workingDirectory) {
            const resolvedCwd = this.resolveIntelliJPath(intellijConfig.workingDirectory);
            // Convert to VS Code workspace-relative path if possible
            if (resolvedCwd.startsWith(this.workspacePath)) {
                const relativePath = path.relative(this.workspacePath, resolvedCwd);
                vsCodeConfig.cwd = relativePath || '${workspaceFolder}';
            } else {
                vsCodeConfig.cwd = resolvedCwd;
            }
        }

        // Handle environment variables
        if (intellijConfig.env && Object.keys(intellijConfig.env).length > 0) {
            vsCodeConfig.env = {};
            for (const [key, value] of Object.entries(intellijConfig.env)) {
                // Resolve paths in environment variable values
                vsCodeConfig.env[key] = this.resolveIntelliJPath(value);
            }
        }

        // Add console setting for better debugging experience
        (vsCodeConfig as any).console = 'integratedTerminal';
    }

    /**
     * Adds common debugging properties that apply to both launch and attach modes
     */
    private addCommonDebugProperties(vsCodeConfig: VSCodeLaunchConfig, intellijConfig: ParsedIntelliJConfig): void {
        // Set debugging behavior options
        if (intellijConfig.justMyCode !== undefined) {
            vsCodeConfig.justMyCode = intellijConfig.justMyCode;
        }

        if (intellijConfig.stopOnEntry !== undefined) {
            vsCodeConfig.stopOnEntry = intellijConfig.stopOnEntry;
        }

        if (intellijConfig.showReturnValue !== undefined) {
            vsCodeConfig.showReturnValue = intellijConfig.showReturnValue;
        }

        if (intellijConfig.subProcess !== undefined) {
            vsCodeConfig.subProcess = intellijConfig.subProcess;
        }
    }

    /**
     * Merges new VS Code configurations with existing ones
     * Preserves existing configurations and adds new ones
     * Updates existing configurations with the same name
     */
    private mergeConfigurations(
        existingConfig: LaunchConfig, 
        newConfigs: VSCodeLaunchConfig[]
    ): LaunchConfig {
        const mergedConfigurations = [...existingConfig.configurations];
        
        for (const newConfig of newConfigs) {
            const existingIndex = mergedConfigurations.findIndex(
                existing => existing.name === newConfig.name
            );
            
            if (existingIndex >= 0) {
                // Update existing configuration
                // Preserve VS Code-specific properties that don't exist in IntelliJ
                const existing = mergedConfigurations[existingIndex];
                mergedConfigurations[existingIndex] = {
                    ...existing,
                    ...newConfig,
                    // Preserve preLaunchTask if it exists in VS Code config
                    preLaunchTask: existing.preLaunchTask || newConfig.preLaunchTask
                };
            } else {
                // Add new configuration
                mergedConfigurations.push(newConfig);
            }
        }

        return {
            ...existingConfig,
            configurations: mergedConfigurations
        };
    }

    /**
     * Parses command line arguments string into array
     */
    private parseCommandLineArgs(argsString: string): string[] {
        if (!argsString.trim()) {
            return [];
        }

        // Simple argument parsing - handles quoted arguments
        const args: string[] = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            
            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
            } else if (inQuotes && char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            } else if (!inQuotes && char === ' ') {
                if (current.trim()) {
                    args.push(current.trim());
                    current = '';
                }
            } else {
                current += char;
            }
        }

        if (current.trim()) {
            args.push(current.trim());
        }

        return args;
    }

    /**
     * Resolves IntelliJ path variables like $PROJECT_DIR$
     */
    private resolveIntelliJPath(pathStr: string): string {
        if (!pathStr) return pathStr;

        // First, replace $PROJECT_DIR$ with ${workspaceFolder}
        let resolved = pathStr.replace(/\$PROJECT_DIR\$/g, '${workspaceFolder}');

        // If the path doesn't contain $PROJECT_DIR$, check if it's an absolute path
        if (!pathStr.includes('$PROJECT_DIR$') && path.isAbsolute(pathStr)) {
            // Convert absolute paths to workspace-relative format
            const relativePath = path.relative(this.workspacePath, pathStr);
            resolved = '${workspaceFolder}/' + relativePath.replace(/\\/g, '/');
        }

        // Normalize path separators
        resolved = resolved.replace(/\\/g, '/');

        return resolved;
    }

    /**
     * Formats the launch configuration as properly formatted JSON
     */
    private formatLaunchJson(config: LaunchConfig): string {
        // Create a complete launch.json structure
        const launchJson = {
            version: '0.2.0',
            configurations: config.configurations
        };

        // Format as JSON with proper indentation
        return JSON.stringify(launchJson, null, 4);
    }

    /**
     * Validates that a VS Code configuration is complete and valid
     */
    private validateVSCodeConfig(config: VSCodeLaunchConfig): boolean {
        // Must have name
        if (!config.name) {
            return false;
        }

        if (config.request === 'attach') {
            // For attach mode, must have connection details
            if (!config.host && !config.connect) {
                return false;
            }
            if (!config.port && !config.connect) {
                return false;
            }
            // If using connect object, it must have both host and port
            if (config.connect && (!config.connect.host || !config.connect.port)) {
                return false;
            }
        } else {
            // For launch mode, must have either program or module
            if (!config.program && !config.module) {
                return false;
            }
        }

        return true;
    }

    /**
     * Gets a unique name for a configuration to avoid conflicts
     */
    private getUniqueName(baseName: string, existingNames: string[]): string {
        let uniqueName = baseName;
        let counter = 1;

        while (existingNames.includes(uniqueName)) {
            uniqueName = `${baseName} (${counter})`;
            counter++;
        }

        return uniqueName;
    }

    /**
     * Creates a backup of the existing launch.json before modifying it
     */
    private createBackup(launchPath: string): void {
        if (fs.existsSync(launchPath)) {
            const backupPath = launchPath + '.backup.' + Date.now();
            fs.copyFileSync(launchPath, backupPath);
            console.log(`Created backup of launch.json at: ${backupPath}`);
        }
    }
}