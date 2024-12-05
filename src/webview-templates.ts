interface StyleVars {
    fontFamily: string;
    backgroundColor: string;
    foregroundColor: string;
    buttonBackground: string;
    buttonForeground: string;
    inputBackground: string;
    inputForeground: string;
    inputBorder: string;
}

interface ProjectInfo {
    steps: number;
    last_updated: string;
}

export function createMainWebviewHtml(styleVars: StyleVars, currentProject?: { name: string, description: string }): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Step Tracker</title>
            <style>
                body { 
                    padding: 10px; 
                    font-family: ${styleVars.fontFamily};
                    background: ${styleVars.backgroundColor};
                    color: ${styleVars.foregroundColor};
                }
                .progress-container {
                    width: 100%;
                    height: 20px;
                    background-color: ${styleVars.inputBackground};
                    border: 1px solid ${styleVars.inputBorder};
                    border-radius: 4px;
                    margin: 10px 0;
                    overflow: hidden;
                }
                .progress-fill {
                    height: 100%;
                    background-color: ${styleVars.buttonBackground};
                    transition: width 0.3s ease-in-out;
                }
                .project-form {
                    margin: 20px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                input {
                    background: ${styleVars.inputBackground};
                    color: ${styleVars.inputForeground};
                    border: 1px solid ${styleVars.inputBorder};
                    padding: 5px;
                    border-radius: 4px;
                }
                button {
                    background: ${styleVars.buttonBackground};
                    color: ${styleVars.buttonForeground};
                    border: none;
                    padding: 5px 10px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                button.delete {
                    background: #d32f2f;
                }
                .project-item {
                    margin: 10px 0;
                    padding: 10px;
                    border: 1px solid ${styleVars.inputBorder};
                    border-radius: 4px;
                }
                .project-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 5px;
                }
                .project-info {
                    font-size: 0.9em;
                    color: #888;
                    margin-bottom: 10px;
                }
                .project-actions {
                    display: flex;
                    gap: 10px;
                }
                .edit-steps-container {
                    display: none;
                    margin-top: 10px;
                }
                .edit-steps-container.active {
                    display: block;
                }
                .edit-form {
                    display: flex;
                    gap: 10px;
                }
            </style>
            <script>
                const vscode = acquireVsCodeApi();
                
                // Initialize UI elements
                document.addEventListener('DOMContentLoaded', () => {
                    initializeEventListeners();
                });

                function initializeEventListeners() {
                    // Add steps form submission
                    document.getElementById('add-steps-form').addEventListener('submit', (e) => {
                        e.preventDefault();
                        addSteps();
                    });

                    // Reset count button
                    document.getElementById('reset-count-btn').addEventListener('click', resetCount);

                    // Listen for messages from the extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'update') {
                            updateUI(message.data);
                        }
                    });
                }

                function updateUI(data) {
                    // Update total steps and monthly limit
                    document.getElementById('total-steps').textContent = data.total_steps;
                    document.getElementById('monthly-limit').textContent = data.monthly_limit;

                    // Update progress bar
                    const progressPercent = (data.total_steps / data.monthly_limit) * 100;
                    document.getElementById('progress-fill').style.width = Math.min(progressPercent, 100) + '%';

                    // Update projects list
                    updateProjectsList(data.sessions);
                }

                function updateProjectsList(sessions) {
                    const projectsList = document.getElementById('projects-list');
                    projectsList.innerHTML = '<h3>Projects</h3>';
                    
                    Object.entries(sessions).forEach(([name, info]) => {
                        const projectDiv = document.createElement('div');
                        projectDiv.className = 'project-item';
                        
                        // Project header
                        const headerDiv = document.createElement('div');
                        headerDiv.className = 'project-header';
                        headerDiv.innerHTML = '<strong>' + name + '</strong><span class="steps-count">' + info.steps + ' steps</span>';
                        
                        // Project info
                        const infoDiv = document.createElement('div');
                        infoDiv.className = 'project-info';
                        infoDiv.innerHTML = 'Last updated: ' + new Date(info.last_updated).toLocaleString();
                        
                        // Project actions
                        const actionsDiv = document.createElement('div');
                        actionsDiv.className = 'project-actions';
                        
                        const editBtn = document.createElement('button');
                        editBtn.textContent = 'Edit Steps';
                        editBtn.onclick = () => showEditForm(name, info.steps);
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'Delete Project';
                        deleteBtn.className = 'delete';
                        deleteBtn.onclick = () => deleteProject(name);
                        
                        actionsDiv.appendChild(editBtn);
                        actionsDiv.appendChild(deleteBtn);
                        
                        // Edit form container
                        const editContainer = document.createElement('div');
                        editContainer.className = 'edit-steps-container';
                        editContainer.id = 'edit-' + name;
                        editContainer.dataset.oldSteps = info.steps;
                        
                        const editForm = document.createElement('div');
                        editForm.className = 'edit-form';
                        editForm.innerHTML = \`
                            <input type="number" id="edit-steps-\${name}" value="\${info.steps}" min="0">
                            <button class="save" onclick="submitEdit('\${name}')">Save</button>
                        \`;
                        
                        editContainer.appendChild(editForm);
                        
                        // Append all elements
                        projectDiv.appendChild(headerDiv);
                        projectDiv.appendChild(infoDiv);
                        projectDiv.appendChild(actionsDiv);
                        projectDiv.appendChild(editContainer);
                        
                        projectsList.appendChild(projectDiv);
                    });
                }

                function addSteps() {
                    const projectInput = document.getElementById('project');
                    const stepsInput = document.getElementById('steps');
                    const project = projectInput.value.trim();
                    const steps = parseInt(stepsInput.value);

                    if (!project) {
                        vscode.postMessage({ type: 'error', message: 'Please enter a project name' });
                        return;
                    }
                    if (isNaN(steps) || steps < 0) {
                        vscode.postMessage({ type: 'error', message: 'Please enter a valid number of steps' });
                        return;
                    }

                    vscode.postMessage({ type: 'addSteps', project, steps });
                    projectInput.value = '';
                    stepsInput.value = '';
                }

                function resetCount() {
                    vscode.postMessage({ type: 'resetCount' });
                }

                function showEditForm(project, currentSteps) {
                    const editContainer = document.getElementById('edit-' + project);
                    editContainer.classList.toggle('active');
                }

                function submitEdit(project) {
                    const input = document.getElementById('edit-steps-' + project);
                    const newSteps = parseInt(input.value);
                    const oldSteps = parseInt(input.parentElement.parentElement.dataset.oldSteps);

                    if (isNaN(newSteps) || newSteps < 0) {
                        vscode.postMessage({ type: 'error', message: 'Please enter a valid number of steps' });
                        return;
                    }

                    if (newSteps !== oldSteps) {
                        vscode.postMessage({
                            type: 'confirmEdit',
                            project,
                            newSteps,
                            message: 'Are you sure you want to update steps for ' + project + ' from ' + oldSteps + ' to ' + newSteps + '?'
                        });
                    }
                }

                function deleteProject(project) {
                    vscode.postMessage({
                        type: 'confirmDelete',
                        project,
                        message: 'Are you sure you want to delete project ' + project + '?'
                    });
                }
            </script>
        </head>
        <body>
            <div class="progress-container">
                <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
            </div>
            <div>
                Steps: <span id="total-steps">0</span> / <span id="monthly-limit">1000</span>
            </div>
            <form id="add-steps-form" class="project-form">
                <input type="text" id="project" placeholder="${currentProject?.name || ''}" value="${currentProject?.name || ''}" >
                <input type="number" id="steps" placeholder="Number of steps" min="0">
                <button type="submit">Add Steps</button>
                <button type="button" id="reset-count-btn">Reset Count</button>
            </form>
            <div id="projects-list">
                <h3>Projects</h3>
            </div>
        </body>
        </html>`;
}

export function createProjectItemHtml(name: string, info: ProjectInfo): string {
    return `
        <div class='project-header'>
            <strong>${name}</strong>
            <span class='steps-count'>${info.steps} steps</span>
        </div>
        <div class='project-info'>
            <div class='timestamp'>Last updated: ${new Date(info.last_updated).toLocaleString()}</div>
        </div>
        <div class='project-actions'>
            <button onclick="showEditForm('${name}', ${info.steps})">Edit Steps</button>
            <button class='delete' onclick="deleteProject('${name}')">Delete Project</button>
        </div>
        <div class='edit-steps-container' id='edit-${name}' data-old-steps='${info.steps}'>
            <div class='edit-form'>
                <input type='number' id='edit-steps-${name}' value='${info.steps}' min='0'>
                <button class='save' onclick="submitEdit('${name}')">Save</button>
            </div>
        </div>`;
}
