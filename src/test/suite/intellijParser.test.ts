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
            const isPython = !!(config.scriptName || config.moduleName || config.sdkHome || config.sdkName);
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
});