import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

/**
 * Interface for SDK information extracted from IntelliJ IDEA configuration files
 */
export interface SDKInfo {
    /** SDK home path, typically extracted from workspace.xml */
    sdkHome?: string;
    /** SDK name, extracted with priority: misc.xml Black component > misc.xml ProjectRootManager > workspace.xml */
    sdkName?: string;
}

/**
 * Extracts SDK_HOME and SDK_NAME values from .idea/misc.xml and .idea/workspace.xml files
 * Priority order: misc.xml Black component sdkName > misc.xml ProjectRootManager project-jdk-name > workspace.xml SDK_NAME
 * @param workspacePath Path to the workspace root directory
 * @returns Promise<SDKInfo> containing SDK information or empty object if not found
 */
export async function extractSDKFromWorkspace(workspacePath: string): Promise<SDKInfo> {
    const workspaceXmlPath = path.join(workspacePath, '.idea', 'workspace.xml');
    
    if (!fs.existsSync(workspaceXmlPath)) {
        console.warn(`workspace.xml not found at: ${workspaceXmlPath}`);
        return {};
    }

    try {
        const xmlContent = fs.readFileSync(workspaceXmlPath, 'utf8');
        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            ignoreAttrs: false
        });

        const result = await parser.parseStringPromise(xmlContent);
        const workspaceSDK = extractSDKFromParsedXML(result);
        
        // Get SDK info from misc.xml with priority
        const miscSDK = extractSDKFromMiscXML(workspacePath);
        
        // Merge with priority: misc.xml sdkName > workspace.xml, but keep workspace.xml sdkHome
        return {
            sdkHome: workspaceSDK.sdkHome,
            sdkName: miscSDK.sdkName || workspaceSDK.sdkName
        };
    } catch (error) {
        console.error(`Error parsing workspace.xml: ${error}`);
        return {};
    }
}

/**
 * Synchronous version of extractSDKFromWorkspace
 * Priority order: misc.xml Black component sdkName > misc.xml ProjectRootManager project-jdk-name > workspace.xml SDK_NAME
 * @param workspacePath Path to the workspace root directory
 * @returns SDKInfo containing SDK information or empty object if not found
 */
export function extractSDKFromWorkspaceSync(workspacePath: string): SDKInfo {
    const workspaceXmlPath = path.join(workspacePath, '.idea', 'workspace.xml');
    
    if (!fs.existsSync(workspaceXmlPath)) {
        console.warn(`workspace.xml not found at: ${workspaceXmlPath}`);
        return {};
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

        const workspaceSDK = extractSDKFromParsedXML(result);
        
        // Get SDK info from misc.xml with priority
        const miscSDK = extractSDKFromMiscXML(workspacePath);
        
        // Merge with priority: misc.xml sdkName > workspace.xml, but keep workspace.xml sdkHome
        return {
            sdkHome: workspaceSDK.sdkHome,
            sdkName: miscSDK.sdkName || workspaceSDK.sdkName
        };
    } catch (error) {
        console.error(`Error parsing workspace.xml: ${error}`);
        return {};
    }
}

/**
 * Extracts SDK information from .idea/misc.xml file
 * @param workspacePath Path to the workspace root directory
 * @returns SDKInfo containing SDK information from misc.xml or empty object if not found
 */
function extractSDKFromMiscXML(workspacePath: string): SDKInfo {
    const miscXmlPath = path.join(workspacePath, '.idea', 'misc.xml');
    
    if (!fs.existsSync(miscXmlPath)) {
        return {};
    }

    try {
        const xmlContent = fs.readFileSync(miscXmlPath, 'utf8');
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

        return extractSDKFromParsedMiscXML(result);
    } catch (error) {
        console.error(`Error parsing misc.xml: ${error}`);
        return {};
    }
}

/**
 * Extracts SDK information from parsed misc.xml object
 * Priority: Black component sdkName > ProjectRootManager project-jdk-name
 * @param parsedXML The parsed XML object from xml2js
 * @returns SDKInfo containing SDK information
 */
function extractSDKFromParsedMiscXML(parsedXML: any): SDKInfo {
    const sdkInfo: SDKInfo = {};

    try {
        const project = parsedXML?.project;
        if (!project) {
            return sdkInfo;
        }

        // Handle both single component and array of components
        const components = Array.isArray(project.component) ? project.component : [project.component];
        
        // First priority: Look for Black component with sdkName
        // const blackComponent = components.find((comp: any) => comp?.name === 'Black');
        // if (blackComponent?.option) {
        //     const options = Array.isArray(blackComponent.option) ? blackComponent.option : [blackComponent.option];
        //     const sdkNameOption = options.find((opt: any) => opt?.name === 'sdkName');
        //     if (sdkNameOption?.value) {
        //         sdkInfo.sdkName = sdkNameOption.value;
        //         return sdkInfo; // Return immediately if found in Black component
        //     }
        // }

        // Second priority: Look for ProjectRootManager with project-jdk-name
        const projectRootManager = components.find((comp: any) => comp?.name === 'ProjectRootManager');
        if (projectRootManager?.['project-jdk-name']) {
            sdkInfo.sdkName = projectRootManager['project-jdk-name'];
        }
    } catch (error) {
        console.error(`Error extracting SDK info from parsed misc.xml: ${error}`);
    }

    return sdkInfo;
}

/**
 * Extracts SDK information from parsed workspace.xml object
 * @param parsedXML The parsed XML object from xml2js
 * @returns SDKInfo containing SDK information
 */
function extractSDKFromParsedXML(parsedXML: any): SDKInfo {
    const sdkInfo: SDKInfo = {};

    try {
        // Navigate to project -> component array
        const project = parsedXML?.project;
        if (!project) {
            return sdkInfo;
        }

        // Handle both single component and array of components
        const components = Array.isArray(project.component) ? project.component : [project.component];
        
        // Find RunManager component
        const runManager = components.find((comp: any) => comp?.name === 'RunManager');
        if (!runManager) {
            return sdkInfo;
        }

        // Handle configurations - can be single object or array
        const configurations = runManager.configuration;
        if (!configurations) {
            return sdkInfo;
        }

        const configArray = Array.isArray(configurations) ? configurations : [configurations];

        // Look through all configurations for SDK options
        for (const config of configArray) {
            if (!config.option) {
                continue;
            }

            // Handle both single option and array of options
            const options = Array.isArray(config.option) ? config.option : [config.option];
            
            for (const option of options) {
                if (option?.name === 'SDK_HOME' && option?.value !== undefined) {
                    sdkInfo.sdkHome = option.value;
                }
                if (option?.name === 'SDK_NAME' && option?.value !== undefined) {
                    sdkInfo.sdkName = option.value;
                }
            }

            // If we found both values, we can stop searching
            if (sdkInfo.sdkHome !== undefined && sdkInfo.sdkName !== undefined) {
                break;
            }
        }
    } catch (error) {
        console.error(`Error extracting SDK info from parsed XML: ${error}`);
    }

    return sdkInfo;
}

/**
 * Checks if workspace.xml exists in the given workspace path
 * @param workspacePath Path to the workspace root directory
 * @returns boolean indicating if workspace.xml exists
 */
export function hasWorkspaceXML(workspacePath: string): boolean {
    const workspaceXmlPath = path.join(workspacePath, '.idea', 'workspace.xml');
    return fs.existsSync(workspaceXmlPath);
}