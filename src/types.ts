/**
 * TypeScript interfaces for VS Code launch configurations and related types
 */

/**
 * VS Code launch configuration interface based on launch.json structure
 */
export interface VSCodeLaunchConfig {
    /** Configuration name */
    name: string;
    /** Configuration type - supports both debugpy and python */
    type: 'debugpy' | 'python';
    /** Request type - 'launch' to start a new process, 'attach' to connect to existing process */
    request: 'launch' | 'attach';
    /** Python module to run (alternative to program) - launch mode only */
    module?: string;
    /** Python program/script path to run (alternative to module) - launch mode only */
    program?: string;
    /** Command line arguments - launch mode only */
    args?: string[];
    /** Environment variables - launch mode only */
    env?: Record<string, string>;
    /** Working directory - launch mode only */
    cwd?: string;
    /** Pre-launch task to run */
    preLaunchTask?: string;
    
    // Attach mode specific properties
    /** Host to connect to for attach mode (default: localhost) */
    host?: string;
    /** Port to connect to for attach mode */
    port?: number;
    /** Connection configuration for attach mode */
    connect?: {
        host: string;
        port: number;
    };
    /** Path mappings for remote debugging */
    pathMappings?: Array<{
        localRoot: string;
        remoteRoot: string;
    }>;
    /** Whether to redirect output in attach mode */
    redirectOutput?: boolean;
    /** Whether to show return values in debugger */
    showReturnValue?: boolean;
    /** Whether to debug only user code (skip library code) */
    justMyCode?: boolean;
    /** Whether to stop on entry */
    stopOnEntry?: boolean;
    /** Whether to enable subprocess debugging */
    subProcess?: boolean;
}

/**
 * Launch.json file structure
 */
export interface LaunchConfig {
    /** Array of launch configurations */
    configurations: VSCodeLaunchConfig[];
}

/**
 * IntelliJ run configuration option
 */
export interface IntelliJConfigOption {
    /** Option name */
    name: string;
    /** Option value */
    value: string;
}

/**
 * IntelliJ environment variable
 */
export interface IntelliJEnvVar {
    /** Environment variable name */
    name: string;
    /** Environment variable value */
    value: string;
}

/**
 * IntelliJ run configuration interface based on XML structure
 */
export interface IntelliJRunConfig {
    /** Configuration name */
    name: string;
    /** Configuration type - typically 'PythonConfigurationType' */
    type: string;
    /** Factory name - typically 'Python' */
    factoryName?: string;
    /** Module name for SDK */
    module?: string;
    /** Whether this is a temporary configuration */
    temporary?: boolean;
    /** Whether the name is generated */
    nameIsGenerated?: boolean;
    /** Configuration options */
    options: IntelliJConfigOption[];
    /** Environment variables */
    envs?: IntelliJEnvVar[];
}

/**
 * Parsed IntelliJ configuration with extracted values
 */
export interface ParsedIntelliJConfig {
    /** Configuration name */
    name: string;
    /** SDK home path */
    sdkHome?: string;
    /** SDK name */
    sdkName?: string;
    /** Script path to run - launch mode */
    scriptName?: string;
    /** Module name to run - launch mode */
    moduleName?: string;
    /** Command line parameters - launch mode */
    parameters?: string;
    /** Working directory - launch mode */
    workingDirectory?: string;
    /** Environment variables - launch mode */
    env?: Record<string, string>;
    /** Whether this is module mode - launch mode */
    moduleMode?: boolean;
    /** Whether this is temporary */
    temporary?: boolean;
    
    // Attach mode specific properties
    /** Whether this is an attach configuration */
    attachMode?: boolean;
    /** Host to attach to */
    attachHost?: string;
    /** Port to attach to */
    attachPort?: number;
    /** Path mappings for remote debugging */
    pathMappings?: Array<{
        localRoot: string;
        remoteRoot: string;
    }>;
    /** Whether to redirect output */
    redirectOutput?: boolean;
    /** Whether to show return values */
    showReturnValue?: boolean;
    /** Whether to debug only user code */
    justMyCode?: boolean;
    /** Whether to stop on entry */
    stopOnEntry?: boolean;
    /** Whether to enable subprocess debugging */
    subProcess?: boolean;
}