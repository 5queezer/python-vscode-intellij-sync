import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Import functions to test
function sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_');
}

function generateIntelliJConfig(config: any): string {
    const isModule = config.module;
    const scriptPath = config.program || '';
    const args = config.args?.join(' ') || '';
    const env = config.env || {};
    const cwd = config.cwd || '';

    let envXml = '';
    for (const [key, value] of Object.entries(env)) {
        envXml += `    <env name="${key}" value="${value}" />\n`;
    }

    return `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="${config.name}" type="PythonConfigurationType" factoryName="Python">
    <module name="" />
    <option name="INTERPRETER_OPTIONS" value="" />
    <option name="PARENT_ENVS" value="true" />
    <envs>
${envXml}    </envs>
    <option name="SDK_HOME" value="" />
    <option name="WORKING_DIRECTORY" value="${cwd}" />
    <option name="IS_MODULE_SDK" value="true" />
    <option name="ADD_CONTENT_ROOTS" value="true" />
    <option name="ADD_SOURCE_ROOTS" value="true" />
    ${isModule
            ? `<EXTENSION ID="PythonCoverageRunConfigurationExtension" runner="coverage.py" />
    <option name="SCRIPT_NAME" value="" />
    <option name="CLASS_NAME" value="" />
    <option name="METHOD_NAME" value="" />
    <option name="FOLDER_NAME" value="" />
    <option name="MODULE_NAME" value="${config.module}" />`
            : `<option name="SCRIPT_NAME" value="${scriptPath}" />`
        }
    <option name="PARAMETERS" value="${args}" />
    <option name="SHOW_COMMAND_LINE" value="false" />
    <option name="EMULATE_TERMINAL" value="false" />
    <option name="MODULE_MODE" value="${isModule ? 'true' : 'false'}" />
    <option name="REDIRECT_INPUT" value="false" />
    <option name="INPUT_FILE" value="" />
    <method v="2" />
  </configuration>
</component>`;
}

describe('Python Debug Config Sync', () => {

    it('should sanitize filenames correctly', () => {
        assert.strictEqual(sanitizeFileName('Test<Config>'), 'Test_Config_');
        assert.strictEqual(sanitizeFileName('My/Config:Name'), 'My_Config_Name');
        assert.strictEqual(sanitizeFileName('Normal Name'), 'Normal Name');
    });

    it('should generate correct XML for program config', () => {
        const config = {
            name: 'Python: Current File',
            type: 'python',
            program: '/path/to/main.py',
            args: ['--debug', '--verbose'],
            env: { DEBUG: 'true' },
            cwd: '/workspace'
        };

        const xml = generateIntelliJConfig(config);

        assert.ok(xml.includes('name="Python: Current File"'));
        assert.ok(xml.includes('SCRIPT_NAME" value="/path/to/main.py"'));
        assert.ok(xml.includes('PARAMETERS" value="--debug --verbose"'));
        assert.ok(xml.includes('MODULE_MODE" value="false"'));
        assert.ok(xml.includes('env name="DEBUG" value="true"'));
        assert.ok(xml.includes('WORKING_DIRECTORY" value="/workspace"'));
    });

    it('should generate correct XML for module config', () => {
        const config = {
            name: 'Python: Module',
            type: 'python',
            module: 'myapp.cli',
            args: ['start'],
            env: { ENV: 'dev' }
        };

        const xml = generateIntelliJConfig(config);

        assert.ok(xml.includes('name="Python: Module"'));
        assert.ok(xml.includes('MODULE_NAME" value="myapp.cli"'));
        assert.ok(xml.includes('MODULE_MODE" value="true"'));
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
        const config = {
            name: 'Simple Config',
            type: 'python',
            program: '/main.py'
        };

        const xml = generateIntelliJConfig(config);

        assert.ok(xml.includes('PARAMETERS" value=""'));
        assert.ok(xml.includes('WORKING_DIRECTORY" value=""'));
        assert.ok(!xml.includes('<env name='));
    });
});