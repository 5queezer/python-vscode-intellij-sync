# Python Debug Config Sync

A VS Code extension that syncs Python debug configurations from VS Code to IntelliJ IDEA.

## Usage

Use the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
Sync Python Debug Configs to IntelliJ
```

This command reads your `.vscode/launch.json` file and generates corresponding IntelliJ run configurations in `.idea/runConfigurations/`.

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
- Python workspace with `.vscode/launch.json` configurations
