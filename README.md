# Windsurf Cascade Monthly Step Tracker

A Windsurf IDE extension that helps you track and manage your Windsurf AI Cascade steps across different projects. Keep track of your monthly step usage and ensure you stay within your limits.

## Features

- 📊 Track total steps used across all projects
- 🎯 Monitor monthly step limits
- 📝 Project-specific step tracking
- 🔄 Reset count functionality
- 📅 Automatic monthly usage tracking
- 💾 Persistent storage of step data
- 🖥️ Convenient sidebar view

## Installation

1. Download the `.vsix` file from the releases page
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Install from VSIX" and select it
5. Navigate to the downloaded `.vsix` file and install

## Usage

### Accessing the Step Tracker

1. Look for the Step Tracker icon in the VS Code activity bar (side bar)
2. Click it to open the Step Tracker panel

### Adding Steps

1. The current project name will be automatically detected from your workspace
2. Enter the number of steps in the input field
3. Click "Add Steps" to record them

### Viewing Statistics

- Total steps used this month
- Monthly step limit
- Per-project step usage
- Last update timestamp

### Resetting Count

- Use the "Reset Count" button to manually reset your step count
- Counts automatically reset at the beginning of each month

### Managing Projects

- Steps are tracked per project
- Project information is automatically detected from your workspace
- Step history is maintained for each project separately

### Configuring Monthly Step Limit

You can change your monthly step limit in two ways:

1. **Through Windsurf Settings**
   - Open Windsurf Settings
   - Search for "windsurf-step-tracker"
   - Look for the "Monthly Limit" setting
   - Enter your desired step limit (default is 1000)

2. **Directly in step-tracker.json**
   - Navigate to `~/.windsurf/step-tracker.json`
   - Find the `monthly_limit` field
   - Update the value to your desired limit
   - Save the file

### Tracking Steps with Cascade AI

Important: You need to explicitly ask Cascade to track steps - it does not happen automatically! 

The step tracking data is stored in:
```
~/.windsurf/step-tracker.json
```

Here's how to track your steps:

1. **Request Step Tracking**
   - At the beginning of your conversation, tell Cascade: "Please track steps for this conversation"
   - Or at any point during/after the conversation: "Please add X steps to my tracker"
   - Make sure to request tracking for each conversation where you want to count steps

2. **View Current Stats**
   - Check the Step Tracker panel in the sidebar
   - Look directly at the `step-tracker.json` file in your home directory
   - Ask Cascade: "How many steps have I used so far?"

3. **Best Practices**
   - Always request step tracking at the start of important conversations
   - Monitor your usage regularly through the Step Tracker panel
   - Review the `step-tracker.json` file if you need detailed history
   - Keep track of your monthly limits to avoid interruptions

Remember: If you don't explicitly ask Cascade to track steps, they won't be recorded in your step count!

## Data Storage

The extension stores all step tracking data in the `.windsurf` directory in your home folder. The data persists between Windsurf sessions and is shared across different Windsurf windows.

## Requirements

- Windsurf IDE
- Active Windsurf AI Cascade subscription

## Contributing

Feel free to submit issues and enhancement requests through the GitHub repository.

## License

[MIT License](LICENSE)

## Release Notes

### 0.1.0

Initial release of Windsurf Cascade Monthly Step Tracker:
- Basic step tracking functionality
- Project-specific tracking
- Monthly limits
- Persistent storage
- User-friendly interface

## Building from Source

If you want to build the extension from source:

1. **Clone the Repository**
   ```bash
   git clone https://github.com/SuBL1MMe/windsurf-cascade-step-tracker.git
   cd windsurf-cascade-step-tracker
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npm install -g @vscode/vsce  # Install vsce globally if you haven't already
   ```

3. **Compile TypeScript**
   ```bash
   npm run compile
   # or for development with watch mode:
   npm run watch
   ```

4. **Package the Extension**
   ```bash
   vsce package
   ```
   This will create a `.vsix` file in the root directory.

5. **Install the Extension**
   - Open Windsurf IDE
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "Install from VSIX" and select it
   - Navigate to the generated `.vsix` file and install

Note: Make sure you have Node.js and npm installed on your system before starting.
