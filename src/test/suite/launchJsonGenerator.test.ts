import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { LaunchJsonGenerator } from '../../launchJsonGenerator';
import { ParsedIntelliJConfig } from '../../types';

describe('LaunchJsonGenerator Test Suite', () => {
    let tempDir: string;
    let generator: LaunchJsonGenerator;

    beforeEach(() => {
        // Create temporary directory for testing
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vscode-test-'));
        generator = new LaunchJsonGenerator(tempDir);
    });

    afterEach(() => {
        // Clean up temporary directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    it('Should create launch.json from IntelliJ script configuration', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Test Script',
            scriptName: `${tempDir}/main.py`,
            parameters: '--verbose --debug',
            workingDirectory: `${tempDir}/src`,
            env: {
                'PYTHONPATH': '/custom/path',
                'DEBUG': 'true'
            },
            sdkHome: '/usr/bin/python3',
            sdkName: 'Python 3.11',
            moduleMode: false
        };

        const syncedCount = await generator.syncToLaunchJson([intellijConfig]);
        assert.strictEqual(syncedCount, 1);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        assert.ok(fs.existsSync(launchPath), 'launch.json should be created');

        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        assert.strictEqual(launchContent.version, '0.2.0');
        assert.strictEqual(launchContent.configurations.length, 1);

        const config = launchContent.configurations[0];
        assert.strictEqual(config.name, 'Test Script');
        assert.strictEqual(config.type, 'debugpy');
        assert.strictEqual(config.request, 'launch');
        assert.strictEqual(config.program, '${workspaceFolder}/main.py');
        assert.deepStrictEqual(config.args, ['--verbose', '--debug']);
        assert.strictEqual(config.cwd, '${workspaceFolder}/src');
        assert.deepStrictEqual(config.env, {
            'PYTHONPATH': '${workspaceFolder}/../../custom/path',
            'DEBUG': 'true'
        });
        assert.strictEqual(config.console, 'integratedTerminal');
    });

    it('Should create launch.json from IntelliJ module configuration', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Test Module',
            moduleName: 'pytest',
            parameters: 'tests/ -v',
            workingDirectory: tempDir,
            env: {
                'PYTHONUNBUFFERED': '1'
            },
            moduleMode: true
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.name, 'Test Module');
        assert.strictEqual(config.module, 'pytest');
        assert.strictEqual(config.program, undefined);
        assert.deepStrictEqual(config.args, ['tests/', '-v']);
        assert.strictEqual(config.cwd, '${workspaceFolder}/');
    });

    it('Should merge with existing launch.json configurations', async () => {
        // Create existing launch.json
        const vscodeDir = path.join(tempDir, '.vscode');
        fs.mkdirSync(vscodeDir, { recursive: true });
        
        const existingLaunch = {
            version: '0.2.0',
            configurations: [
                {
                    name: 'Existing Config',
                    type: 'debugpy',
                    request: 'launch',
                    program: '${file}',
                    console: 'integratedTerminal'
                }
            ]
        };
        
        fs.writeFileSync(
            path.join(vscodeDir, 'launch.json'),
            JSON.stringify(existingLaunch, null, 4)
        );

        const intellijConfig: ParsedIntelliJConfig = {
            name: 'New Config',
            scriptName: `${tempDir}/new.py`,
            moduleMode: false
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchContent = JSON.parse(fs.readFileSync(path.join(vscodeDir, 'launch.json'), 'utf8'));
        assert.strictEqual(launchContent.configurations.length, 2);
        
        const existingConfig = launchContent.configurations.find((c: any) => c.name === 'Existing Config');
        const newConfig = launchContent.configurations.find((c: any) => c.name === 'New Config');
        
        assert.ok(existingConfig, 'Should preserve existing configuration');
        assert.ok(newConfig, 'Should add new configuration');
        assert.strictEqual(newConfig.program, '${workspaceFolder}/new.py');
    });

    it('Should update existing configuration with same name', async () => {
        // Create existing launch.json with config that will be updated
        const vscodeDir = path.join(tempDir, '.vscode');
        fs.mkdirSync(vscodeDir, { recursive: true });
        
        const existingLaunch = {
            version: '0.2.0',
            configurations: [
                {
                    name: 'Test Config',
                    type: 'debugpy',
                    request: 'launch',
                    program: '${file}',
                    preLaunchTask: 'build',
                    console: 'integratedTerminal'
                }
            ]
        };
        
        fs.writeFileSync(
            path.join(vscodeDir, 'launch.json'),
            JSON.stringify(existingLaunch, null, 4)
        );

        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Test Config',
            scriptName: `${tempDir}/updated.py`,
            parameters: '--new-args',
            moduleMode: false
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchContent = JSON.parse(fs.readFileSync(path.join(vscodeDir, 'launch.json'), 'utf8'));
        assert.strictEqual(launchContent.configurations.length, 1);
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.name, 'Test Config');
        assert.strictEqual(config.program, '${workspaceFolder}/updated.py');
        assert.deepStrictEqual(config.args, ['--new-args']);
        assert.strictEqual(config.preLaunchTask, 'build'); // Should preserve VS Code-specific property
    });

    it('Should handle quoted arguments correctly', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Quoted Args Test',
            scriptName: `${tempDir}/test.py`,
            parameters: '--file "path with spaces.txt" --name \'single quotes\' --simple arg',
            moduleMode: false
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.deepStrictEqual(config.args, [
            '--file',
            'path with spaces.txt',
            '--name',
            'single quotes',
            '--simple',
            'arg'
        ]);
    });

    it('Should handle empty or missing parameters', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'No Params',
            scriptName: `${tempDir}/test.py`,
            moduleMode: false
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.args, undefined);
    });

    it('Should handle multiple configurations', async () => {
        const intellijConfigs: ParsedIntelliJConfig[] = [
            {
                name: 'Script Config',
                scriptName: `${tempDir}/script.py`,
                moduleMode: false
            },
            {
                name: 'Module Config',
                moduleName: 'mymodule',
                moduleMode: true
            }
        ];

        const syncedCount = await generator.syncToLaunchJson(intellijConfigs);
        assert.strictEqual(syncedCount, 2);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        assert.strictEqual(launchContent.configurations.length, 2);
        
        const scriptConfig = launchContent.configurations.find((c: any) => c.name === 'Script Config');
        const moduleConfig = launchContent.configurations.find((c: any) => c.name === 'Module Config');
        
        assert.ok(scriptConfig?.program);
        assert.ok(moduleConfig?.module);
    });

    it('Should handle environment variables with paths correctly', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Path Env Test',
            scriptName: `${tempDir}/test.py`,
            env: {
                'SIMPLE_VAR': 'value',
                'PATH_VAR': `${tempDir}/../swisseph/ephe`,
                'WORKSPACE_PATH': `${tempDir}/data`
            },
            moduleMode: false
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.env['SIMPLE_VAR'], 'value');
        assert.strictEqual(config.env['PATH_VAR'], '${workspaceFolder}/../swisseph/ephe');
        assert.strictEqual(config.env['WORKSPACE_PATH'], '${workspaceFolder}/data');
    });

    it('Should create attach mode configuration with default settings', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Python Attach',
            attachMode: true,
            attachHost: 'localhost',
            attachPort: 5678
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.name, 'Python Attach');
        assert.strictEqual(config.type, 'debugpy');
        assert.strictEqual(config.request, 'attach');
        assert.strictEqual(config.host, 'localhost');
        assert.strictEqual(config.port, 5678);
        assert.deepStrictEqual(config.connect, {
            host: 'localhost',
            port: 5678
        });
        assert.deepStrictEqual(config.pathMappings, [{
            localRoot: '${workspaceFolder}',
            remoteRoot: '.'
        }]);
        // Should not have launch-specific properties
        assert.strictEqual(config.program, undefined);
        assert.strictEqual(config.module, undefined);
        assert.strictEqual(config.args, undefined);
    });

    it('Should create attach mode configuration with custom path mappings', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Remote Python Attach',
            attachMode: true,
            attachHost: '192.168.1.100',
            attachPort: 3000,
            pathMappings: [
                {
                    localRoot: `${tempDir}/src`,
                    remoteRoot: '/app/src'
                },
                {
                    localRoot: `${tempDir}/tests`,
                    remoteRoot: '/app/tests'
                }
            ],
            redirectOutput: true,
            justMyCode: false,
            stopOnEntry: true
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.name, 'Remote Python Attach');
        assert.strictEqual(config.request, 'attach');
        assert.strictEqual(config.host, '192.168.1.100');
        assert.strictEqual(config.port, 3000);
        assert.deepStrictEqual(config.pathMappings, [
            {
                localRoot: '${workspaceFolder}/src',
                remoteRoot: '/app/src'
            },
            {
                localRoot: '${workspaceFolder}/tests',
                remoteRoot: '/app/tests'
            }
        ]);
        assert.strictEqual(config.redirectOutput, true);
        assert.strictEqual(config.justMyCode, false);
        assert.strictEqual(config.stopOnEntry, true);
    });

    it('Should create attach mode with default port when not specified', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Default Port Attach',
            attachMode: true,
            attachHost: 'remote-server'
            // No port specified
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.host, 'remote-server');
        assert.strictEqual(config.port, 5678); // Default port
        assert.deepStrictEqual(config.connect, {
            host: 'remote-server',
            port: 5678
        });
    });

    it('Should create attach mode with default host when not specified', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Default Host Attach',
            attachMode: true,
            attachPort: 9999
            // No host specified
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.host, 'localhost'); // Default host
        assert.strictEqual(config.port, 9999);
        assert.deepStrictEqual(config.connect, {
            host: 'localhost',
            port: 9999
        });
    });

    it('Should handle mixed launch and attach configurations', async () => {
        const intellijConfigs: ParsedIntelliJConfig[] = [
            {
                name: 'Launch Script',
                scriptName: `${tempDir}/main.py`,
                moduleMode: false
            },
            {
                name: 'Attach Remote',
                attachMode: true,
                attachHost: 'localhost',
                attachPort: 5678
            }
        ];

        const syncedCount = await generator.syncToLaunchJson(intellijConfigs);
        assert.strictEqual(syncedCount, 2);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        assert.strictEqual(launchContent.configurations.length, 2);
        
        const launchConfig = launchContent.configurations.find((c: any) => c.name === 'Launch Script');
        const attachConfig = launchContent.configurations.find((c: any) => c.name === 'Attach Remote');
        
        // Verify launch config
        assert.ok(launchConfig);
        assert.strictEqual(launchConfig.request, 'launch');
        assert.ok(launchConfig.program);
        assert.strictEqual(launchConfig.host, undefined);
        assert.strictEqual(launchConfig.port, undefined);
        
        // Verify attach config
        assert.ok(attachConfig);
        assert.strictEqual(attachConfig.request, 'attach');
        assert.strictEqual(attachConfig.host, 'localhost');
        assert.strictEqual(attachConfig.port, 5678);
        assert.strictEqual(attachConfig.program, undefined);
        assert.strictEqual(attachConfig.module, undefined);
    });

    it('Should handle all debugging options for attach mode', async () => {
        const intellijConfig: ParsedIntelliJConfig = {
            name: 'Full Options Attach',
            attachMode: true,
            attachHost: 'debug-server',
            attachPort: 8080,
            redirectOutput: false,
            justMyCode: true,
            stopOnEntry: false,
            showReturnValue: true,
            subProcess: true
        };

        await generator.syncToLaunchJson([intellijConfig]);

        const launchPath = path.join(tempDir, '.vscode', 'launch.json');
        const launchContent = JSON.parse(fs.readFileSync(launchPath, 'utf8'));
        
        const config = launchContent.configurations[0];
        assert.strictEqual(config.redirectOutput, false);
        assert.strictEqual(config.justMyCode, true);
        assert.strictEqual(config.stopOnEntry, false);
        assert.strictEqual(config.showReturnValue, true);
        assert.strictEqual(config.subProcess, true);
    });
});