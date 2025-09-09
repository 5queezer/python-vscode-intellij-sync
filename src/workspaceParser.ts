import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

export interface SDKInfo {
    sdkHome?: string;
    sdkName?: string;
}

/**
 * Extracts SDK_HOME and SDK_NAME values from .idea/workspace.xml file
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
        return extractSDKFromParsedXML(result);
    } catch (error) {
        console.error(`Error parsing workspace.xml: ${error}`);
        return {};
    }
}

/**
 * Synchronous version of extractSDKFromWorkspace
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

        return extractSDKFromParsedXML(result);
    } catch (error) {
        console.error(`Error parsing workspace.xml: ${error}`);
        return {};
    }
}

/**
 * Extracts SDK information from parsed XML object
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