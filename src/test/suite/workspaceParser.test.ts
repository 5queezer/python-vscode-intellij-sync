import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { extractSDKFromWorkspaceSync, hasWorkspaceXML, SDKInfo } from '../../workspaceParser';

describe('Workspace Parser Test Suite', () => {
    // Use process.cwd() to get the workspace root directory
    const testDataPath = path.join(process.cwd(), 'test-data');
    const testWorkspacePath = path.join(testDataPath, '.idea');

    before(() => {
        // Ensure .idea directory exists with workspace.xml
        if (!fs.existsSync(testWorkspacePath)) {
            fs.mkdirSync(testWorkspacePath, { recursive: true });
        }
        
        const targetWorkspaceXml = path.join(testWorkspacePath, 'workspace.xml');
        
        // Create workspace.xml if it doesn't exist
        if (!fs.existsSync(targetWorkspaceXml)) {
            const workspaceContent = `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="RunManager" selected="Python.main">
    <configuration name="main" type="PythonConfigurationType" factoryName="Python" temporary="true" nameIsGenerated="true">
      <module name="freqtrade" />
      <option name="INTERPRETER_OPTIONS" value="" />
      <option name="PARENT_ENVS" value="true" />
      <envs>
        <env name="PYTHONUNBUFFERED" value="1" />
      </envs>
      <option name="SDK_HOME" value="/home/user/.pyenv/versions/3.11.0/bin/python" />
      <option name="SDK_NAME" value="freqtrade" />
      <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
      <option name="IS_MODULE_SDK" value="true" />
      <option name="ADD_CONTENT_ROOTS" value="true" />
      <option name="ADD_SOURCE_ROOTS" value="true" />
      <option name="SCRIPT_NAME" value="$PROJECT_DIR$/main.py" />
      <option name="PARAMETERS" value="" />
      <option name="SHOW_COMMAND_LINE" value="false" />
      <option name="EMULATE_TERMINAL" value="false" />
      <option name="MODULE_MODE" value="false" />
      <option name="REDIRECT_INPUT" value="false" />
      <option name="INPUT_FILE" value="" />
      <method v="2" />
    </configuration>
  </component>
</project>`;
            fs.writeFileSync(targetWorkspaceXml, workspaceContent);
        }
    });

    after(() => {
        // Clean up is optional since we're using the existing test-data structure
    });

    it('should extract SDK_HOME and SDK_NAME from workspace.xml', () => {
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testDataPath);
        
        assert.strictEqual(sdkInfo.sdkHome, '/home/user/.pyenv/versions/3.11.0/bin/python');
        assert.strictEqual(sdkInfo.sdkName, 'freqtrade');
    });

    it('should return empty object when workspace.xml does not exist', () => {
        const nonExistentPath = path.join(testDataPath, 'non-existent');
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(nonExistentPath);
        
        assert.deepStrictEqual(sdkInfo, {});
    });

    it('should detect workspace.xml existence correctly', () => {
        assert.strictEqual(hasWorkspaceXML(testDataPath), true);
        assert.strictEqual(hasWorkspaceXML(path.join(testDataPath, 'non-existent')), false);
    });

    it('should handle malformed XML gracefully', () => {
        // Create a temporary malformed XML file
        const malformedPath = path.join(testDataPath, '.idea-malformed');
        const malformedXmlPath = path.join(malformedPath, 'workspace.xml');
        
        fs.mkdirSync(malformedPath, { recursive: true });
        fs.writeFileSync(malformedXmlPath, '<invalid><xml>malformed</invalid>');
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(path.join(testDataPath, '.idea-malformed'));
        
        // Should return empty object for malformed XML
        assert.deepStrictEqual(sdkInfo, {});
        
        // Clean up
        fs.unlinkSync(malformedXmlPath);
        fs.rmdirSync(malformedPath);
    });

    it('should handle workspace.xml without RunManager component', () => {
        // Create a workspace.xml without RunManager
        const noRunManagerPath = path.join(testDataPath, '.idea-no-runmanager');
        const noRunManagerXmlPath = path.join(noRunManagerPath, 'workspace.xml');
        
        fs.mkdirSync(noRunManagerPath, { recursive: true });
        fs.writeFileSync(noRunManagerXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="SomeOtherComponent">
    <option name="someOption" value="someValue" />
  </component>
</project>`);
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(path.join(testDataPath, '.idea-no-runmanager'));
        
        // Should return empty object when no RunManager component
        assert.deepStrictEqual(sdkInfo, {});
        
        // Clean up
        fs.unlinkSync(noRunManagerXmlPath);
        fs.rmdirSync(noRunManagerPath);
    });
});