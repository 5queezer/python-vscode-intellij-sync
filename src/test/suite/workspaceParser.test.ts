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

    it('should extract SDK_HOME from workspace.xml and SDK_NAME from misc.xml (ProjectRootManager)', () => {
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testDataPath);
        
        assert.strictEqual(sdkInfo.sdkHome, '/home/user/.pyenv/versions/3.11.0/bin/python');
        // Should prioritize misc.xml ProjectRootManager over workspace.xml SDK_NAME (Black component is disabled)
        assert.strictEqual(sdkInfo.sdkName, 'unique123');
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

    it('should prioritize misc.xml ProjectRootManager over workspace.xml (Black component disabled)', () => {
        // Create a test workspace directory structure
        const testWorkspacePath = path.join(testDataPath, 'priority-test');
        const testIdeaPath = path.join(testWorkspacePath, '.idea');
        const testMiscXmlPath = path.join(testIdeaPath, 'misc.xml');
        const testWorkspaceXmlPath = path.join(testIdeaPath, 'workspace.xml');
        
        fs.mkdirSync(testIdeaPath, { recursive: true });
        
        // Create misc.xml with both Black and ProjectRootManager components
        fs.writeFileSync(testMiscXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="Black">
    <option name="sdkName" value="Black SDK" />
  </component>
  <component name="ProjectRootManager" version="2" project-jdk-name="ProjectRoot SDK" project-jdk-type="Python SDK" />
</project>`);
        
        // Create workspace.xml with SDK_NAME
        fs.writeFileSync(testWorkspaceXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="RunManager">
    <configuration name="test" type="PythonConfigurationType">
      <option name="SDK_HOME" value="/test/python" />
      <option name="SDK_NAME" value="Workspace SDK" />
    </configuration>
  </component>
</project>`);
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testWorkspacePath);
        
        // Should prioritize ProjectRootManager over workspace.xml (Black component is disabled)
        assert.strictEqual(sdkInfo.sdkName, 'ProjectRoot SDK');
        assert.strictEqual(sdkInfo.sdkHome, '/test/python');
        
        // Clean up
        fs.unlinkSync(testMiscXmlPath);
        fs.unlinkSync(testWorkspaceXmlPath);
        fs.rmdirSync(testIdeaPath);
        fs.rmdirSync(testWorkspacePath);
    });

    it('should use ProjectRootManager when available (Black component disabled)', () => {
        // Create a test workspace directory structure
        const testWorkspacePath = path.join(testDataPath, 'projectroot-test');
        const testIdeaPath = path.join(testWorkspacePath, '.idea');
        const testMiscXmlPath = path.join(testIdeaPath, 'misc.xml');
        const testWorkspaceXmlPath = path.join(testIdeaPath, 'workspace.xml');
        
        fs.mkdirSync(testIdeaPath, { recursive: true });
        
        // Create misc.xml with only ProjectRootManager
        fs.writeFileSync(testMiscXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="ProjectRootManager" version="2" project-jdk-name="ProjectRoot SDK" project-jdk-type="Python SDK" />
</project>`);
        
        // Create workspace.xml with SDK_NAME
        fs.writeFileSync(testWorkspaceXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="RunManager">
    <configuration name="test" type="PythonConfigurationType">
      <option name="SDK_HOME" value="/test/python" />
      <option name="SDK_NAME" value="Workspace SDK" />
    </configuration>
  </component>
</project>`);
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testWorkspacePath);
        
        // Should use ProjectRootManager over workspace.xml
        assert.strictEqual(sdkInfo.sdkName, 'ProjectRoot SDK');
        assert.strictEqual(sdkInfo.sdkHome, '/test/python');
        
        // Clean up
        fs.unlinkSync(testMiscXmlPath);
        fs.unlinkSync(testWorkspaceXmlPath);
        fs.rmdirSync(testIdeaPath);
        fs.rmdirSync(testWorkspacePath);
    });

    it('should fall back to workspace.xml when misc.xml is missing', () => {
        // Create a test workspace directory structure with only workspace.xml
        const testWorkspacePath = path.join(testDataPath, 'workspace-only-test');
        const testIdeaPath = path.join(testWorkspacePath, '.idea');
        const testWorkspaceXmlPath = path.join(testIdeaPath, 'workspace.xml');
        
        fs.mkdirSync(testIdeaPath, { recursive: true });
        fs.writeFileSync(testWorkspaceXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="RunManager">
    <configuration name="test" type="PythonConfigurationType">
      <option name="SDK_HOME" value="/test/python" />
      <option name="SDK_NAME" value="Workspace SDK" />
    </configuration>
  </component>
</project>`);
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testWorkspacePath);
        
        // Should use workspace.xml values
        assert.strictEqual(sdkInfo.sdkName, 'Workspace SDK');
        assert.strictEqual(sdkInfo.sdkHome, '/test/python');
        
        // Clean up
        fs.unlinkSync(testWorkspaceXmlPath);
        fs.rmdirSync(testIdeaPath);
        fs.rmdirSync(testWorkspacePath);
    });

    it('should handle malformed misc.xml gracefully', () => {
        // Create a test workspace directory structure
        const testWorkspacePath = path.join(testDataPath, 'malformed-misc-test');
        const testIdeaPath = path.join(testWorkspacePath, '.idea');
        const testMiscXmlPath = path.join(testIdeaPath, 'misc.xml');
        const testWorkspaceXmlPath = path.join(testIdeaPath, 'workspace.xml');
        
        fs.mkdirSync(testIdeaPath, { recursive: true });
        
        // Create malformed misc.xml
        fs.writeFileSync(testMiscXmlPath, '<invalid><xml>malformed</invalid>');
        
        // Create valid workspace.xml
        fs.writeFileSync(testWorkspaceXmlPath, `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="RunManager">
    <configuration name="test" type="PythonConfigurationType">
      <option name="SDK_HOME" value="/test/python" />
      <option name="SDK_NAME" value="Workspace SDK" />
    </configuration>
  </component>
</project>`);
        
        const sdkInfo: SDKInfo = extractSDKFromWorkspaceSync(testWorkspacePath);
        
        // Should fall back to workspace.xml when misc.xml is malformed
        assert.strictEqual(sdkInfo.sdkName, 'Workspace SDK');
        assert.strictEqual(sdkInfo.sdkHome, '/test/python');
        
        // Clean up
        fs.unlinkSync(testMiscXmlPath);
        fs.unlinkSync(testWorkspaceXmlPath);
        fs.rmdirSync(testIdeaPath);
        fs.rmdirSync(testWorkspacePath);
    });
});