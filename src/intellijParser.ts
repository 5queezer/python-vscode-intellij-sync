import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { IntelliJRunConfig, IntelliJConfigOption, IntelliJEnvVar, ParsedIntelliJConfig } from './types';

/**
 * Parses IntelliJ run configurations from both .idea/runConfigurations/*.xml files
 * and embedded configurations in workspace.xml
 */
export class IntelliJConfigParser {
    private workspacePath: string;

    constructor(workspacePath: string) {
        this.workspacePath = workspacePath;
    }

    /**
     * Extracts all Python run configurations from IntelliJ
     * @returns Array of parsed IntelliJ configurations
     */
    async extractAllPythonConfigs(): Promise<ParsedIntelliJConfig[]> {
        const configs: ParsedIntelliJConfig[] = [];

        // Parse individual run configuration files
        const runConfigsFromFiles = await this.parseRunConfigurationFiles();
        configs.push(...runConfigsFromFiles);

        // Parse configurations from workspace.xml
        const runConfigsFromWorkspace = await this.parseWorkspaceConfigurations();
        configs.push(...runConfigsFromWorkspace);

        // Filter for Python configurations only
        return configs.filter(config => this.isPythonConfiguration(config));
    }

    /**
     * Synchronous version of extractAllPythonConfigs
     */
    extractAllPythonConfigsSync(): ParsedIntelliJConfig[] {
        const configs: ParsedIntelliJConfig[] = [];

        // Parse individual run configuration files
        const runConfigsFromFiles = this.parseRunConfigurationFilesSync();
        configs.push(...runConfigsFromFiles);

        // Parse configurations from workspace.xml
        const runConfigsFromWorkspace = this.parseWorkspaceConfigurationsSync();
        configs.push(...runConfigsFromWorkspace);

        // Filter for Python configurations only
        return configs.filter(config => this.isPythonConfiguration(config));
    }

    /**
     * Parses run configurations from .idea/runConfigurations/*.xml files
     */
    private async parseRunConfigurationFiles(): Promise<ParsedIntelliJConfig[]> {
        const runConfigsPath = path.join(this.workspacePath, '.idea', 'runConfigurations');
        
        if (!fs.existsSync(runConfigsPath)) {
            return [];
        }

        const configs: ParsedIntelliJConfig[] = [];
        const files = fs.readdirSync(runConfigsPath).filter(file => file.endsWith('.xml'));

        for (const file of files) {
            try {
                const filePath = path.join(runConfigsPath, file);
                const xmlContent = fs.readFileSync(filePath, 'utf8');
                const parsedConfig = await this.parseConfigurationXML(xmlContent);
                if (parsedConfig) {
                    configs.push(parsedConfig);
                }
            } catch (error) {
                console.warn(`Failed to parse run configuration file ${file}: ${error}`);
            }
        }

        return configs;
    }

    /**
     * Synchronous version of parseRunConfigurationFiles
     */
    private parseRunConfigurationFilesSync(): ParsedIntelliJConfig[] {
        const runConfigsPath = path.join(this.workspacePath, '.idea', 'runConfigurations');
        
        if (!fs.existsSync(runConfigsPath)) {
            return [];
        }

        const configs: ParsedIntelliJConfig[] = [];
        const files = fs.readdirSync(runConfigsPath).filter(file => file.endsWith('.xml'));

        for (const file of files) {
            try {
                const filePath = path.join(runConfigsPath, file);
                const xmlContent = fs.readFileSync(filePath, 'utf8');
                const parsedConfig = this.parseConfigurationXMLSync(xmlContent);
                if (parsedConfig) {
                    configs.push(parsedConfig);
                }
            } catch (error) {
                console.warn(`Failed to parse run configuration file ${file}: ${error}`);
            }
        }

        return configs;
    }

    /**
     * Parses run configurations from workspace.xml
     */
    private async parseWorkspaceConfigurations(): Promise<ParsedIntelliJConfig[]> {
        const workspaceXmlPath = path.join(this.workspacePath, '.idea', 'workspace.xml');
        
        if (!fs.existsSync(workspaceXmlPath)) {
            return [];
        }

        try {
            const xmlContent = fs.readFileSync(workspaceXmlPath, 'utf8');
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: true,
                ignoreAttrs: false
            });

            const result = await parser.parseStringPromise(xmlContent);
            return this.extractConfigurationsFromWorkspace(result);
        } catch (error) {
            console.error(`Error parsing workspace.xml: ${error}`);
            return [];
        }
    }

    /**
     * Synchronous version of parseWorkspaceConfigurations
     */
    private parseWorkspaceConfigurationsSync(): ParsedIntelliJConfig[] {
        const workspaceXmlPath = path.join(this.workspacePath, '.idea', 'workspace.xml');
        
        if (!fs.existsSync(workspaceXmlPath)) {
            return [];
        }

        try {
            const xmlContent = fs.readFileSync(workspaceXmlPath, 'utf8');
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: true,
                ignoreAttrs: false
            });

            let result: any;
            parser.parseString(xmlContent, (err: any, parsed: any) => {
                if (err) {
                    throw err;
                }
                result = parsed;
            });

            return this.extractConfigurationsFromWorkspace(result);
        } catch (error) {
            console.error(`Error parsing workspace.xml: ${error}`);
            return [];
        }
    }

    /**
     * Parses a single configuration XML content
     */
    private async parseConfigurationXML(xmlContent: string): Promise<ParsedIntelliJConfig | null> {
        try {
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: true,
                ignoreAttrs: false
            });

            const result = await parser.parseStringPromise(xmlContent);
            const component = result?.component;
            
            if (!component || !component.configuration) {
                return null;
            }

            return this.parseIntelliJConfiguration(component.configuration);
        } catch (error) {
            console.error(`Error parsing configuration XML: ${error}`);
            return null;
        }
    }

    /**
     * Synchronous version of parseConfigurationXML
     */
    private parseConfigurationXMLSync(xmlContent: string): ParsedIntelliJConfig | null {
        try {
            const parser = new xml2js.Parser({
                explicitArray: false,
                mergeAttrs: true,
                ignoreAttrs: false
            });

            let result: any;
            parser.parseString(xmlContent, (err: any, parsed: any) => {
                if (err) {
                    throw err;
                }
                result = parsed;
            });

            const component = result?.component;
            
            if (!component || !component.configuration) {
                return null;
            }

            return this.parseIntelliJConfiguration(component.configuration);
        } catch (error) {
            console.error(`Error parsing configuration XML: ${error}`);
            return null;
        }
    }

    /**
     * Extracts configurations from parsed workspace.xml
     */
    private extractConfigurationsFromWorkspace(parsedXML: any): ParsedIntelliJConfig[] {
        const configs: ParsedIntelliJConfig[] = [];

        try {
            const project = parsedXML?.project;
            if (!project) {
                return configs;
            }

            const components = Array.isArray(project.component) ? project.component : [project.component];
            const runManager = components.find((comp: any) => comp?.name === 'RunManager');
            
            if (!runManager || !runManager.configuration) {
                return configs;
            }

            const configurations = Array.isArray(runManager.configuration) 
                ? runManager.configuration 
                : [runManager.configuration];

            for (const config of configurations) {
                const parsedConfig = this.parseIntelliJConfiguration(config);
                if (parsedConfig) {
                    configs.push(parsedConfig);
                }
            }
        } catch (error) {
            console.error(`Error extracting configurations from workspace: ${error}`);
        }

        return configs;
    }

    /**
     * Parses a single IntelliJ configuration object
     */
    private parseIntelliJConfiguration(config: any): ParsedIntelliJConfig | null {
        if (!config || !config.name) {
            return null;
        }

        const parsedConfig: ParsedIntelliJConfig = {
            name: config.name,
            temporary: config.temporary === 'true'
        };

        // Parse options
        if (config.option) {
            const options = Array.isArray(config.option) ? config.option : [config.option];
            
            for (const option of options) {
                if (!option.name || option.value === undefined) continue;

                switch (option.name) {
                    case 'SDK_HOME':
                        parsedConfig.sdkHome = option.value;
                        break;
                    case 'SDK_NAME':
                        parsedConfig.sdkName = option.value;
                        break;
                    case 'SCRIPT_NAME':
                        parsedConfig.scriptName = this.resolveIntelliJPath(option.value);
                        break;
                    case 'MODULE_NAME':
                        parsedConfig.moduleName = option.value;
                        break;
                    case 'PARAMETERS':
                        parsedConfig.parameters = option.value;
                        break;
                    case 'WORKING_DIRECTORY':
                        parsedConfig.workingDirectory = this.resolveIntelliJPath(option.value);
                        break;
                    case 'MODULE_MODE':
                        parsedConfig.moduleMode = option.value === 'true';
                        break;
                    // Attach mode specific options
                    case 'ATTACH_MODE':
                    case 'IS_ATTACH':
                        parsedConfig.attachMode = option.value === 'true';
                        break;
                    case 'HOST':
                    case 'ATTACH_HOST':
                        parsedConfig.attachHost = option.value;
                        break;
                    case 'PORT':
                    case 'ATTACH_PORT':
                        parsedConfig.attachPort = parseInt(option.value, 10);
                        break;
                    case 'REDIRECT_OUTPUT':
                        parsedConfig.redirectOutput = option.value === 'true';
                        break;
                    case 'JUST_MY_CODE':
                        parsedConfig.justMyCode = option.value === 'true';
                        break;
                    case 'STOP_ON_ENTRY':
                        parsedConfig.stopOnEntry = option.value === 'true';
                        break;
                    case 'SHOW_RETURN_VALUE':
                        parsedConfig.showReturnValue = option.value === 'true';
                        break;
                    case 'SUBPROCESS':
                    case 'SUB_PROCESS':
                        parsedConfig.subProcess = option.value === 'true';
                        break;
                }
            }
        }

        // Parse environment variables
        if (config.envs && config.envs.env) {
            const envVars = Array.isArray(config.envs.env) ? config.envs.env : [config.envs.env];
            parsedConfig.env = {};
            
            for (const envVar of envVars) {
                if (envVar.name && envVar.value !== undefined) {
                    // Resolve IntelliJ path variables in environment variable values
                    parsedConfig.env[envVar.name] = this.resolveIntelliJPath(envVar.value);
                }
            }
        }

        // Parse path mappings for remote debugging
        if (config.pathMappings && config.pathMappings.mapping) {
            const mappings = Array.isArray(config.pathMappings.mapping)
                ? config.pathMappings.mapping
                : [config.pathMappings.mapping];
            
            parsedConfig.pathMappings = [];
            for (const mapping of mappings) {
                if (mapping.localRoot && mapping.remoteRoot) {
                    parsedConfig.pathMappings.push({
                        localRoot: this.resolveIntelliJPath(mapping.localRoot),
                        remoteRoot: mapping.remoteRoot
                    });
                }
            }
        }

        return parsedConfig;
    }

    /**
     * Checks if a configuration is a Python configuration
     */
    private isPythonConfiguration(config: ParsedIntelliJConfig): boolean {
        // Check if it has Python-specific properties or is an attach mode configuration
        return !!(config.scriptName || config.moduleName || config.sdkHome || config.sdkName || config.attachMode);
    }

    /**
     * Resolves IntelliJ path variables like $PROJECT_DIR$
     */
    resolveIntelliJPath(pathStr: string): string {
        if (!pathStr) return pathStr;

        return pathStr
            .replace(/\$PROJECT_DIR\$/g, this.workspacePath)
            .replace(/\\/g, '/'); // Normalize path separators
    }
}