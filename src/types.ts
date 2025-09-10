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
    /** Request type - typically 'launch' for our use case */
    request: 'launch';
    /** Python module to run (alternative to program) */
    module?: string;
    /** Python program/script path to run (alternative to module) */
    program?: string;
    /** Command line arguments */
    args?: string[];
    /** Environment variables */
    env?: Record<string, string>;
    /** Working directory */
    cwd?: string;
    /** Pre-launch task to run */
    preLaunchTask?: string;
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
    /** Script path to run */
    scriptName?: string;
    /** Module name to run */
    moduleName?: string;
    /** Command line parameters */
    parameters?: string;
    /** Working directory */
    workingDirectory?: string;
    /** Environment variables */
    env?: Record<string, string>;
    /** Whether this is module mode */
    moduleMode?: boolean;
    /** Whether this is temporary */
    temporary?: boolean;
}