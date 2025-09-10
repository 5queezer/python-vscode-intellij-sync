# Python Debug Config Sync

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue.svg)](https://marketplace.visualstudio.com/items?itemName=ChristianPojoni.python-debug-sync)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A VS Code extension that enables bidirectional synchronization of Python debug configurations between VS Code and IntelliJ IDEA/PyCharm.

## Features

- **Bidirectional Sync**: Transfer configurations in both directions
- **Smart Merging**: Preserves existing configurations while intelligently adding new ones
- **Multiple Sources**: Supports both persistent run configurations and workspace-specific settings
- **Safe Operations**: Never overwrites existing configurations without explicit merging logic

## Installation

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ChristianPojoni.python-debug-sync) or via command line:

```bash
code --install-extension ChristianPojoni.python-debug-sync
```

## Usage

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and choose:

- **Sync Python Debug Configs to IntelliJ** - Export VS Code configurations to IntelliJ
- **Sync Python Debug Configs from IntelliJ** - Import IntelliJ configurations to VS Code

### VS Code to IntelliJ Sync

Converts your VS Code `launch.json` configurations into IntelliJ run configurations.

- Reads `.vscode/launch.json` file
- Converts Python debug configurations (`debugpy` and `python` types)
- Generates XML files in `.idea/runConfigurations/`
- Preserves script paths, module names, arguments, and environment variables

Example configuration:

```json
{
    "configurations": [
        {
            "name": "Run Main Script",
            "type": "debugpy",
            "request": "launch",
            "program": "${workspaceFolder}/main.py",
            "args": ["--verbose", "--config=dev"],
            "env": {"DEBUG": "1"}
        }
    ]
}
```

### IntelliJ to VS Code Sync

Imports IntelliJ run configurations into your VS Code setup with intelligent merging.

**Sources supported:**
- **Persistent configurations**: `.idea/runConfigurations/*.xml` (shared with team)
- **Workspace configurations**: `.idea/workspace.xml` (local to developer)

**Smart merging behavior:**
- Preserves existing VS Code configurations that don't conflict
- Updates configurations with matching names while keeping VS Code-specific properties
- Adds new configurations from IntelliJ
- Maintains proper JSON formatting

## Configuration Types Supported

| Feature | VS Code | IntelliJ | Notes |
|---------|---------|----------|-------|
| Script execution | `program` | `SCRIPT_NAME` | Full file paths |
| Module execution | `module` | `MODULE_NAME` | Python module names |
| Command arguments | `args[]` | `PARAMETERS` | Parsed from command line |
| Environment variables | `env{}` | `<envs>` | Key-value pairs |
| Working directory | `cwd` | `WORKING_DIRECTORY` | Relative to workspace |
| Pre-launch tasks | `preLaunchTask` | - | VS Code only (preserved) |

## Requirements

- VS Code 1.60.0 or higher
- For VS Code to IntelliJ: Existing `.vscode/launch.json` with Python configurations
- For IntelliJ to VS Code: IntelliJ project with `.idea/` folder

## Development

### Setup

```bash
git clone <repository-url>
cd python-vscode-intellij-sync
npm install
```

### Building

```bash
# Development build with watch mode
npm run watch

# Production build
npm run bundle

# Run tests
npm test
```

### Packaging

```bash
npm run package
```

This generates `build/launch.json-vscode.vsix` which can be installed locally or published to the marketplace.

## Architecture

```
src/
├── extension.ts          # Main extension entry point
├── types.ts             # TypeScript interfaces
├── intellijParser.ts    # IntelliJ XML configuration parser
├── launchJsonGenerator.ts # VS Code launch.json generator
├── xmlGenerator.ts      # IntelliJ XML configuration generator
├── workspaceParser.ts   # IntelliJ workspace.xml parser
└── test/               # Test suites
```

## Contributing

Contributions are welcome! Please submit a Pull Request or open an issue for major changes.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
