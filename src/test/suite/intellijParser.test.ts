import * as assert from 'assert';
import * as path from 'path';
import { IntelliJConfigParser } from '../../intellijParser';

describe('IntelliJConfigParser Test Suite', () => {
    const testDataPath = path.join(process.cwd(), 'test-data');

    it('Should parse run configuration files', async () => {
        const parser = new IntelliJConfigParser(testDataPath);
        const configs = await parser.extractAllPythonConfigs();
        
        assert.ok(configs.length > 0, 'Should find at least one configuration');
        
        // Check for script-based configuration
        const scriptConfig = configs.find(c => c.name === 'Python Script Test');
        assert.ok(scriptConfig, 'Should find Python Script Test configuration');
        assert.strictEqual(scriptConfig?.scriptName, `${testDataPath}/main.py`);
        assert.strictEqual(scriptConfig?.parameters, '--verbose --config config.json');
        assert.strictEqual(scriptConfig?.workingDirectory, `${testDataPath}/src`);
        assert.ok(scriptConfig?.env, 'Should have environment variables');
        assert.strictEqual(scriptConfig?.env?.['PYTHONPATH'], '/custom/path');
        assert.strictEqual(scriptConfig?.env?.['DEBUG_MODE'], 'true');
        
        // Check for module-based configuration
        const moduleConfig = configs.find(c => c.name === 'Python Module Test');
        assert.ok(moduleConfig, 'Should find Python Module Test configuration');
        assert.strictEqual(moduleConfig?.moduleName, 'pytest');
        assert.strictEqual(moduleConfig?.moduleMode, true);
        assert.strictEqual(moduleConfig?.parameters, 'tests/ -v --tb=short');
    });

    it('Should parse workspace.xml configurations', async () => {
        const parser = new IntelliJConfigParser(testDataPath);
        const configs = await parser.extractAllPythonConfigs();
        
        // Should include configurations from workspace.xml
        const workspaceConfig = configs.find(c => c.name === 'main');
        assert.ok(workspaceConfig, 'Should find main configuration from workspace.xml');
        assert.strictEqual(workspaceConfig?.sdkHome, '/home/user/.pyenv/versions/3.11.0/bin/python');
        assert.strictEqual(workspaceConfig?.sdkName, 'freqtrade');
    });

    it('Should resolve IntelliJ path variables', () => {
        const parser = new IntelliJConfigParser(testDataPath);
        const resolved = parser.resolveIntelliJPath('$PROJECT_DIR$/main.py');
        const expected = `${testDataPath}/main.py`;
        assert.strictEqual(resolved, expected);
    });

    it('Should handle empty or non-existent directories', async () => {
        const parser = new IntelliJConfigParser('/non/existent/path');
        const configs = await parser.extractAllPythonConfigs();
        assert.strictEqual(configs.length, 0, 'Should return empty array for non-existent path');
    });

    it('Should filter Python configurations only', async () => {
        const parser = new IntelliJConfigParser(testDataPath);
        const configs = await parser.extractAllPythonConfigs();
        
        // All returned configs should be Python-related
        for (const config of configs) {
            const isPython = !!(config.scriptName || config.moduleName || config.sdkHome || config.sdkName || config.attachMode);
            assert.ok(isPython, `Configuration ${config.name} should be Python-related`);
        }
    });

    it('Should use synchronous version correctly', () => {
        const parser = new IntelliJConfigParser(testDataPath);
        const configs = parser.extractAllPythonConfigsSync();
        
        assert.ok(configs.length > 0, 'Sync version should find configurations');
        
        const scriptConfig = configs.find(c => c.name === 'Python Script Test');
        assert.ok(scriptConfig, 'Sync version should find Python Script Test configuration');
    });

    it('Should parse attach mode configuration from test data', async () => {
        // First, let's create a test attach configuration file
        const fs = require('fs');
        const ideaDir = path.join(testDataPath, '.idea', 'runConfigurations');
        
        // Ensure directory exists
        if (!fs.existsSync(ideaDir)) {
            fs.mkdirSync(ideaDir, { recursive: true });
        }

        const attachConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Python Attach Test" type="PythonConfigurationType" factoryName="Python">
    <option name="ATTACH_MODE" value="true" />
    <option name="HOST" value="localhost" />
    <option name="PORT" value="5678" />
    <option name="REDIRECT_OUTPUT" value="true" />
    <option name="JUST_MY_CODE" value="false" />
    <option name="STOP_ON_ENTRY" value="true" />
    <option name="SHOW_RETURN_VALUE" value="true" />
    <option name="SUBPROCESS" value="false" />
    <pathMappings>
      <mapping localRoot="$PROJECT_DIR$/src" remoteRoot="/app/src" />
      <mapping localRoot="$PROJECT_DIR$/tests" remoteRoot="/app/tests" />
    </pathMappings>
    <method v="2" />
  </configuration>
</component>`;

        const configPath = path.join(ideaDir, 'Python_Attach_Test.xml');
        fs.writeFileSync(configPath, attachConfigXml);

        try {
            const parser = new IntelliJConfigParser(testDataPath);
            const configs = await parser.extractAllPythonConfigs();
            
            const attachConfig = configs.find(c => c.name === 'Python Attach Test');
            assert.ok(attachConfig, 'Should find Python Attach Test configuration');
            assert.strictEqual(attachConfig?.attachMode, true);
            assert.strictEqual(attachConfig?.attachHost, 'localhost');
            assert.strictEqual(attachConfig?.attachPort, 5678);
            assert.strictEqual(attachConfig?.redirectOutput, true);
            assert.strictEqual(attachConfig?.justMyCode, false);
            assert.strictEqual(attachConfig?.stopOnEntry, true);
            assert.strictEqual(attachConfig?.showReturnValue, true);
            assert.strictEqual(attachConfig?.subProcess, false);
            
            // Check path mappings
            assert.ok(attachConfig?.pathMappings);
            assert.strictEqual(attachConfig.pathMappings.length, 2);
            assert.strictEqual(attachConfig.pathMappings[0].localRoot, path.join(testDataPath, 'src'));
            assert.strictEqual(attachConfig.pathMappings[0].remoteRoot, '/app/src');
            assert.strictEqual(attachConfig.pathMappings[1].localRoot, path.join(testDataPath, 'tests'));
            assert.strictEqual(attachConfig.pathMappings[1].remoteRoot, '/app/tests');
            
            // Should not have launch-specific properties
            assert.strictEqual(attachConfig?.scriptName, undefined);
            assert.strictEqual(attachConfig?.moduleName, undefined);
            assert.strictEqual(attachConfig?.parameters, undefined);
            assert.strictEqual(attachConfig?.workingDirectory, undefined);
        } finally {
            // Clean up test file
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }
    });

    it('Should parse remote attach configuration with alternative option names', async () => {
        const fs = require('fs');
        const ideaDir = path.join(testDataPath, '.idea', 'runConfigurations');
        
        if (!fs.existsSync(ideaDir)) {
            fs.mkdirSync(ideaDir, { recursive: true });
        }

        const remoteAttachXml = `<?xml version="1.0" encoding="UTF-8"?>
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Remote Attach" type="PythonConfigurationType" factoryName="Python">
    <option name="IS_ATTACH" value="true" />
    <option name="ATTACH_HOST" value="192.168.1.100" />
    <option name="ATTACH_PORT" value="3000" />
    <option name="SUB_PROCESS" value="true" />
    <method v="2" />
  </configuration>
</component>`;

        const configPath = path.join(ideaDir, 'Remote_Attach.xml');
        fs.writeFileSync(configPath, remoteAttachXml);

        try {
            const parser = new IntelliJConfigParser(testDataPath);
            const configs = await parser.extractAllPythonConfigs();
            
            const attachConfig = configs.find(c => c.name === 'Remote Attach');
            assert.ok(attachConfig, 'Should find Remote Attach configuration');
            assert.strictEqual(attachConfig?.attachMode, true);
            assert.strictEqual(attachConfig?.attachHost, '192.168.1.100');
            assert.strictEqual(attachConfig?.attachPort, 3000);
            assert.strictEqual(attachConfig?.subProcess, true);
        } finally {
            if (fs.existsSync(configPath)) {
                fs.unlinkSync(configPath);
            }
        }
    });
});