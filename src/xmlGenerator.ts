export function generateIntelliJConfig(config: any, pythonPath: string): string {
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
    <option name="SDK_HOME" value="${pythonPath}" />
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

export function sanitizeFileName(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_');
}