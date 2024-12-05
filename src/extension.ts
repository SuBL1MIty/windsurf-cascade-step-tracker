import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createMainWebviewHtml, createProjectItemHtml } from './webview-templates';

interface StepData {
    total_steps: number;
    monthly_limit: number;
    sessions: {
        [key: string]: {
            steps: number;
            last_updated: string;
        };
    };
    last_reset: string;
}

export class StepTrackerProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'stepTrackerView';
    private _view?: vscode.WebviewView;
    private _fileWatcher?: vscode.FileSystemWatcher;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        // Set up file watcher for the step tracker file
        const windsurfDir = path.join(os.homedir(), '.windsurf');
        const trackerPath = path.join(windsurfDir, 'step-tracker.json');
        this._fileWatcher = vscode.workspace.createFileSystemWatcher(trackerPath);
        
        // Update view when file changes (triggered by other VSCode instances)
        this._fileWatcher.onDidChange(() => {
            this._updateView();
        });

        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('windsurf-step-tracker.monthlyLimit')) {
                this._updateView();
            }
        });
    }

    dispose() {
        if (this._fileWatcher) {
            this._fileWatcher.dispose();
        }
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        // Initial update
        this._updateView();

        // Update when the view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                this._updateView();
            }
        });

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'addSteps':
                    await this.addSteps(data.project, data.steps);
                    break;
                case 'resetCount':
                    await this.resetCount();
                    break;
                case 'confirmDelete':
                    const deleteChoice = await vscode.window.showWarningMessage(
                        data.message,
                        { modal: true },
                        'Delete',
                        'Cancel'
                    );
                    if (deleteChoice === 'Delete') {
                        await this.deleteProject(data.project);
                        vscode.window.showInformationMessage(`Deleted project ${data.project}`);
                    }
                    break;
                case 'confirmEdit':
                    const editChoice = await vscode.window.showWarningMessage(
                        data.message,
                        { modal: true },
                        'Update',
                        'Cancel'
                    );
                    if (editChoice === 'Update') {
                        await this.editSteps(data.project, data.newSteps);
                        vscode.window.showInformationMessage(`Updated steps for ${data.project} to ${data.newSteps}`);
                    }
                    break;
                case 'error':
                    vscode.window.showErrorMessage(data.message);
                    break;
            }
        });
    }

    private async _updateView() {
        if (this._view) {
            const data = await this._getStepData();
            this._view.webview.postMessage({ type: 'update', data });
        }
    }

    private _getHtmlForWebview() {
        const styleVars = {
            fontFamily: 'var(--vscode-font-family)',
            backgroundColor: 'var(--vscode-editor-background)',
            foregroundColor: 'var(--vscode-editor-foreground)',
            buttonBackground: 'var(--vscode-button-background)',
            buttonForeground: 'var(--vscode-button-foreground)',
            inputBackground: 'var(--vscode-input-background)',
            inputForeground: 'var(--vscode-input-foreground)',
            inputBorder: 'var(--vscode-input-border)',
        };

        const currentProject = this._getCurrentProjectInfo();
        return createMainWebviewHtml(styleVars, currentProject ?? { name: '', description: '' });
    }

    private _getStepData(): StepData {
        const windsurfDir = path.join(os.homedir(), '.windsurf');
        const trackerPath = path.join(windsurfDir, 'step-tracker.json');

        // Create .windsurf directory if it doesn't exist
        if (!fs.existsSync(windsurfDir)) {
            fs.mkdirSync(windsurfDir, { recursive: true });
        }

        const config = vscode.workspace.getConfiguration('windsurf-step-tracker');
        const monthlyLimit = config.get<number>('monthlyLimit', 1000);

        if (!fs.existsSync(trackerPath)) {
            const initialData: StepData = {
                total_steps: 0,
                monthly_limit: monthlyLimit,
                sessions: {},
                last_reset: new Date().toISOString()
            };
            fs.writeFileSync(trackerPath, JSON.stringify(initialData, null, 2));
            return initialData;
        }

        const data = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
        // Update monthly limit if configuration changed
        if (data.monthly_limit !== monthlyLimit) {
            data.monthly_limit = monthlyLimit;
            fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2));
        }
        return data;
    }

    private _getCurrentProjectInfo() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        const activeFolder = workspaceFolders[0];
        const packageJsonPath = path.join(activeFolder.uri.fsPath, 'package.json');
        
        try {
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                return {
                    name: packageJson.name || path.basename(activeFolder.uri.fsPath),
                    description: packageJson.description || ''
                };
            }
            return {
                name: path.basename(activeFolder.uri.fsPath),
                description: ''
            };
        } catch {
            return {
                name: path.basename(activeFolder.uri.fsPath),
                description: ''
            };
        }
    }

    public async addSteps(project: string, steps: number) {
        const data = this._getStepData();
        if (!data.sessions[project]) {
            data.sessions[project] = {
                steps: 0,
                last_updated: new Date().toISOString()
            };
        }
        data.sessions[project].steps += steps;
        data.sessions[project].last_updated = new Date().toISOString();
        data.total_steps += steps;

        const trackerPath = path.join(os.homedir(), '.windsurf', 'step-tracker.json');
        fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2));
        await this._updateView();
    }

    public async editSteps(project: string, newSteps: number) {
        try {
            const data = this._getStepData();
            if (data.sessions[project]) {
                const oldSteps = data.sessions[project].steps;
                data.total_steps = data.total_steps - oldSteps + newSteps;
                data.sessions[project].steps = newSteps;
                data.sessions[project].last_updated = new Date().toISOString();

                const trackerPath = path.join(os.homedir(), '.windsurf', 'step-tracker.json');
                fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2));
                await this._updateView();
            } else {
                throw new Error(`Project ${project} not found`);
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred');
            }
        }
    }

    public async deleteProject(project: string) {
        try {
            const data = this._getStepData();
            if (data.sessions[project]) {
                data.total_steps -= data.sessions[project].steps;
                delete data.sessions[project];

                const trackerPath = path.join(os.homedir(), '.windsurf', 'step-tracker.json');
                fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2));
                await this._updateView();
            } else {
                throw new Error(`Project ${project} not found`);
            }
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(error.message);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred');
            }
        }
    }

    private async resetCount() {
        const data = this._getStepData();
        data.total_steps = 0;
        data.sessions = {};
        data.last_reset = new Date().toISOString();

        const trackerPath = path.join(os.homedir(), '.windsurf', 'step-tracker.json');
        fs.writeFileSync(trackerPath, JSON.stringify(data, null, 2));
        await this._updateView();
    }
}

export function activate(context: vscode.ExtensionContext) {
    const provider = new StepTrackerProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(StepTrackerProvider.viewType, provider),
        provider
    );

    let disposable = vscode.commands.registerCommand('windsurf-step-tracker.showSteps', () => {
        vscode.commands.executeCommand('workbench.view.extension.step-tracker');
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
