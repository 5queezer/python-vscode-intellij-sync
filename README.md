# Python Debug Config Sync

A VS Code extension that syncs Python debug configurations bidirectionally between VS Code and IntelliJ IDEA/PyCharm.

## Features

- **VS Code → IntelliJ**: Sync Python debug configurations from VS Code to IntelliJ IDEA/PyCharm
- **IntelliJ → VS Code**: Sync Python debug configurations from IntelliJ IDEA/PyCharm to VS Code
- **Smart Merging**: Preserves existing configurations while adding new ones
- **Multiple Sources**: Supports both individual run configuration files and workspace.xml configurations

## Usage

### Sync from VS Code to IntelliJ

Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
Sync Python Debug Configs to IntelliJ
```

This command reads your `.vscode/launch.json` file and generates corresponding IntelliJ run configurations in `.idea/runConfigurations/`.

### Sync from IntelliJ to VS Code

Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
Sync Python Debug Configs from IntelliJ
```

This command reads IntelliJ run configurations from:
- `.idea/runConfigurations/*.xml` files (persistent configurations)
- `.idea/workspace.xml` (temporary configurations)

And creates or updates corresponding configurations in your `.vscode/launch.json` file.

## Development

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure TypeScript is available (if needed)
npx tsc --version
```

### Building

```bash
npm run bundle
```

### Testing

```bash
npm test
```

### Packaging to VSX

```bash
# Generate .vsix package using @vscode/vsce
npm run package
```

This uses [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce) to generate a `.vsix` file in the `build/` directory that can be:

- Installed locally: `code --install-extension build/launch.json-vscode.vsix`
- Published to VS Code Marketplace
- Shared with team members

## Requirements

- VS Code 1.60.0 or higher
- For VS Code → IntelliJ: Python workspace with `.vscode/launch.json` configurations
- For IntelliJ → VS Code: IntelliJ IDEA/PyCharm project with `.idea` folder

## Smart Merging

When syncing from IntelliJ to VS Code, the extension:

- **Preserves existing VS Code configurations** that don't conflict
- **Updates configurations with the same name** while preserving VS Code-specific properties (like `preLaunchTask`)
- **Adds new configurations** from IntelliJ that don't exist in VS Code
- **Maintains proper formatting** of the launch.json file

## Supported IntelliJ Configuration Sources

1. **Individual Run Configuration Files**: `.idea/runConfigurations/*.xml`
   - These are persistent configurations saved by IntelliJ
   - Typically shared across team members

2. **Workspace Configurations**: `.idea/workspace.xml`
   - These are temporary configurations stored in workspace
   - Usually local to individual developers
