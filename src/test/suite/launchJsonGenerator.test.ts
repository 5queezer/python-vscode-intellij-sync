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
});