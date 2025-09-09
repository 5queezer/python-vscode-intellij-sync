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