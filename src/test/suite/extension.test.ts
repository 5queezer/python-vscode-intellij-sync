import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import JSONC from 'tiny-jsonc';

// Import functions to test from extension
import { sanitizeFileName, generateIntelliJConfig } from '../../xmlGenerator';
import { VSCodeLaunchConfig } from '../../types';


describe('Python Debug Config Sync', () => {

    it('should sanitize filenames correctly', () => {
        assert.strictEqual(sanitizeFileName('Test<Config>'), 'Test_Config_');
        assert.strictEqual(sanitizeFileName('My/Config:Name'), 'My_Config_Name');
        assert.strictEqual(sanitizeFileName('Normal Name'), 'Normal Name');
    });

    it('should generate correct XML for program config', () => {
        const config: VSCodeLaunchConfig = {
            name: 'Python: Current File',
            type: 'python',
            request: 'launch',
            program: '/path/to/main.py',
            args: ['--debug', '--verbose'],
            env: { DEBUG: 'true' },
            cwd: '/workspace'
        };

        const xml = generateIntelliJConfig(config, '/usr/bin/python', 'test-sdk');

        assert.ok(xml.includes('name="Python: Current File"'));
        assert.ok(xml.includes('SCRIPT_NAME" value="/path/to/main.py"'));
        assert.ok(xml.includes('PARAMETERS" value="--debug --verbose"'));
        assert.ok(xml.includes('MODULE_MODE" value="false"'));
        assert.ok(xml.includes('IS_MODULE_SDK" value="false"'));
        assert.ok(xml.includes('env name="DEBUG" value="true"'));
        assert.ok(xml.includes('WORKING_DIRECTORY" value="/workspace"'));
    });

    it('should generate correct XML for module config', () => {
        const config: VSCodeLaunchConfig = {
            name: 'Python: Module',
            type: 'python',
            request: 'launch',
            module: 'myapp.cli',
            args: ['start'],
            env: { ENV: 'dev' }
        };

        const xml = generateIntelliJConfig(config, '/usr/bin/python', 'test-sdk');

        assert.ok(xml.includes('name="Python: Module"'));
        assert.ok(xml.includes('MODULE_NAME" value="myapp.cli"'));
        assert.ok(xml.includes('SCRIPT_NAME" value="myapp.cli"'));
        assert.ok(xml.includes('MODULE_MODE" value="true"'));
        assert.ok(xml.includes('IS_MODULE_SDK" value="false"'));
        assert.ok(xml.includes('PARAMETERS" value="start"'));
        assert.ok(xml.includes('env name="ENV" value="dev"'));
    });

    it('should handle both debugpy and python types', () => {
        const configs = [
            { name: 'Modern', type: 'debugpy', program: '/main.py' },
            { name: 'Legacy', type: 'python', module: 'app' },
            { name: 'Node', type: 'node', program: '/app.js' }
        ];

        const pythonConfigs = configs.filter((c: any) => c.type === 'debugpy' || c.type === 'python');

        assert.strictEqual(pythonConfigs.length, 2);
        assert.strictEqual(pythonConfigs[0].name, 'Modern');
        assert.strictEqual(pythonConfigs[1].name, 'Legacy');
    });

    it('should handle empty config values', () => {
        const config: VSCodeLaunchConfig = {
            name: 'Simple Config',
            type: 'python',
            request: 'launch',
            program: '/main.py'
        };

        const xml = generateIntelliJConfig(config, '/usr/bin/python');

        assert.ok(xml.includes('PARAMETERS" value=""'));
        assert.ok(xml.includes('WORKING_DIRECTORY" value=""'));
        assert.ok(xml.includes('IS_MODULE_SDK" value="false"'));
        assert.ok(!xml.includes('<env name='));
    });

    it('should load and parse JSON with comments from test-data/launch.json', () => {
        // Use absolute path from workspace root
        const testDataPath = path.join(process.cwd(), 'test-data', 'launch.json');
        
        // Verify the test data file exists
        assert.ok(fs.existsSync(testDataPath), `Test data file should exist at ${testDataPath}`);
        
        // Read the file content
        const fileContent = fs.readFileSync(testDataPath, 'utf8');
        
        // Verify it contains a comment
        assert.ok(fileContent.includes('//'), 'File should contain comments');
        
        // Parse the JSON with comments using tiny-jsonc
        const config = JSONC.parse(fileContent);
        
        // Verify the parsed structure
        assert.ok(config.configurations, 'Should have configurations array');
        assert.ok(Array.isArray(config.configurations), 'configurations should be an array');
        assert.ok(config.configurations.length > 0, 'Should have at least one configuration');
        
        // Test specific configuration
        const currentFileConfig = config.configurations.find((c: any) =>
            c.name === 'Python: Current File'
        );
        assert.ok(currentFileConfig, 'Should find Python: Current File configuration');
        assert.strictEqual(currentFileConfig.type, 'debugpy');
        assert.strictEqual(currentFileConfig.program, '${file}');
    });

    it('should load and parse JSON with comments from test-data/launch.json and convert it into valid pycharm xml run config', () => {
        // Use absolute path from workspace root
        const testDataPath = path.join(process.cwd(), 'test-data', 'launch.json');
        
        // Verify the test data file exists
        assert.ok(fs.existsSync(testDataPath), `Test data file should exist at ${testDataPath}`);
        
        // Read the file content
        const fileContent = fs.readFileSync(testDataPath, 'utf8');
        
        // Verify it contains a comment
        assert.ok(fileContent.includes('//'), 'File should contain comments');
        
        // Parse the JSON with comments using tiny-jsonc
        const launchConfig = JSONC.parse(fileContent);
        
        // Verify the parsed structure
        assert.ok(launchConfig.configurations, 'Should have configurations array');
        assert.ok(Array.isArray(launchConfig.configurations), 'configurations should be an array');
        assert.ok(launchConfig.configurations.length > 0, 'Should have at least one configuration');
        
        // Filter Python configurations (both debugpy and python types)
        const pythonConfigs = launchConfig.configurations.filter((c: any) =>
            c.type === 'debugpy' || c.type === 'python'
        );
        
        assert.ok(pythonConfigs.length > 0, 'Should have at least one Python configuration');
        
        // Test conversion of each Python configuration to PyCharm XML
        pythonConfigs.forEach((config: any) => {
            if (config.request === 'launch' && (config.program || config.module)) {
                const xml = generateIntelliJConfig(config, '/usr/bin/python', 'freqtrade');
                
                // Verify the XML structure
                assert.ok(xml.includes('<component name="ProjectRunConfigurationManager">'),
                    'XML should contain ProjectRunConfigurationManager component');
                assert.ok(xml.includes('type="PythonConfigurationType"'),
                    'XML should specify PythonConfigurationType');
                assert.ok(xml.includes('factoryName="Python"'),
                    'XML should specify Python factory');
                assert.ok(xml.includes(`name="${config.name}"`),
                    `XML should contain config name: ${config.name}`);
                
                // Test module vs program configuration
                if (config.module) {
                    assert.ok(xml.includes(`MODULE_NAME" value="${config.module}"`),
                        `XML should contain module name: ${config.module}`);
                    assert.ok(xml.includes(`SCRIPT_NAME" value="${config.module}"`),
                        `XML should contain script name with module value: ${config.module}`);
                    assert.ok(xml.includes('MODULE_MODE" value="true"'),
                        'XML should set MODULE_MODE to true for module configs');
                } else if (config.program) {
                    assert.ok(xml.includes(`SCRIPT_NAME" value="${config.program}"`),
                        `XML should contain script path: ${config.program}`);
                    assert.ok(xml.includes('MODULE_MODE" value="false"'),
                        'XML should set MODULE_MODE to false for program configs');
                }
                
                // Verify IS_MODULE_SDK is always false
                assert.ok(xml.includes('IS_MODULE_SDK" value="false"'),
                    'XML should set IS_MODULE_SDK to false');
                
                // Test arguments conversion
                if (config.args && Array.isArray(config.args)) {
                    const expectedArgs = config.args.join(' ');
                    assert.ok(xml.includes(`PARAMETERS" value="${expectedArgs}"`),
                        `XML should contain parameters: ${expectedArgs}`);
                }
                
                // Test environment variables conversion
                if (config.env) {
                    Object.entries(config.env).forEach(([key, value]) => {
                        assert.ok(xml.includes(`<env name="${key}" value="${value}" />`),
                            `XML should contain environment variable: ${key}=${value}`);
                    });
                }
                
                // Test working directory
                if (config.cwd) {
                    assert.ok(xml.includes(`WORKING_DIRECTORY" value="${config.cwd}"`),
                        `XML should contain working directory: ${config.cwd}`);
                }
                
                // Verify XML is well-formed by checking basic structure
                assert.ok(xml.includes('</configuration>'), 'XML should have closing configuration tag');
                assert.ok(xml.includes('</component>'), 'XML should have closing component tag');
            }
        });
        
        // Test specific configuration from test data
        const moduleConfig = pythonConfigs.find((c: any) =>
            c.name === 'Python: Module'
        );
        assert.ok(moduleConfig, 'Should find Python: Module configuration');
        
        const xml = generateIntelliJConfig(moduleConfig, '/usr/bin/python', 'test-sdk');
        assert.ok(xml.includes('name="Python: Module"'),
            'XML should contain the correct configuration name');
        assert.ok(xml.includes('MODULE_NAME" value="main"'),
            'XML should contain the main module');
        assert.ok(xml.includes('SCRIPT_NAME" value="main"'),
            'XML should contain the script name with module value');
        assert.ok(xml.includes('MODULE_MODE" value="true"'),
            'XML should set MODULE_MODE to true for module configs');
        assert.ok(xml.includes('IS_MODULE_SDK" value="false"'),
            'XML should set IS_MODULE_SDK to false');
    });
});