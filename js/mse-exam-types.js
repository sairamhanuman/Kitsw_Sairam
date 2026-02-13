/**
 * MSE Exam Type Management - Frontend JavaScript
 * Handles Mid-Semester Examination types and configuration
 */

const API_BASE = '/api/mse-exam-types';
let currentEditId = null;
let allExamTypes = [];
let allConfigurations = [];

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadAllData();
    setupFormHandlers();
});

/**
 * Initialize tab switching functionality
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for active tab
    if (tabName === 'exam-types') loadExamTypes();
    if (tabName === 'configuration') loadConfiguration();
    if (tabName === 'templates') loadTemplates();
}

/**
 * Load all initial data
 */
async function loadAllData() {
    await loadExamTypes();
    await loadConfiguration();
}

/**
 * Setup form submit handlers
 */
function setupFormHandlers() {
    // MSE Exam Type form
    document.getElementById('mseExamTypeForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveExamType();
    });
}

// =====================================================
// MSE EXAM TYPE MANAGEMENT
// =====================================================

/**
 * Load all MSE exam types
 */
async function loadExamTypes() {
    try {
        showLoading('examTypesTable');
        const response = await fetch(`${API_BASE}/`);
        const result = await response.json();

        if (result.status === 'success') {
            allExamTypes = result.data;
            displayExamTypes(result.data);
        } else {
            showError('examTypesTable', result.message);
        }
    } catch (error) {
        console.error('Error loading MSE exam types:', error);
        showError('examTypesTable', 'Failed to load MSE exam types');
    }
}

/**
 * Display MSE exam types in table
 */
function displayExamTypes(examTypes) {
    const container = document.getElementById('examTypesTable');
    
    if (examTypes.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                <p>No MSE exam types found. Create your first exam type above.</p>
            </div>
        `;
        return;
    }

    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Max Marks</th>
                    <th>Duration</th>
                    <th>Gap Required</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${examTypes.map(examType => `
                    <tr>
                        <td><strong>${examType.exam_type_code}</strong></td>
                        <td>${examType.exam_type_name}</td>
                        <td><span class="status-badge status-active">${examType.exam_category}</span></td>
                        <td>${examType.max_marks}</td>
                        <td>${examType.duration_minutes} min</td>
                        <td>${examType.gap_required_minutes} min</td>
                        <td>
                            <span class="status-badge ${examType.is_active ? 'status-active' : 'status-inactive'}">
                                ${examType.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                        <td>
                            <div class="actions">
                                <button class="btn btn-primary" onclick="editExamType(${examType.exam_type_id})" style="padding: 5px 10px; font-size: 12px;">
                                    Edit
                                </button>
                                <button class="btn btn-danger" onclick="deleteExamType(${examType.exam_type_id})" style="padding: 5px 10px; font-size: 12px;">
                                    Delete
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    
    container.innerHTML = tableHTML;
}

/**
 * Save MSE exam type (create or update)
 */
async function saveExamType() {
    try {
        const formData = {
            exam_type_code: document.getElementById('examTypeCode').value,
            exam_type_name: document.getElementById('examTypeName').value,
            exam_category: document.getElementById('examCategory').value,
            description: document.getElementById('description').value,
            max_marks: parseInt(document.getElementById('maxMarks').value) || 50,
            duration_minutes: parseInt(document.getElementById('durationMinutes').value) || 120,
            gap_required_minutes: parseInt(document.getElementById('gapRequiredMinutes').value) || 0,
            requires_invigilator: document.getElementById('requiresInvigilator').checked,
            allows_multiple_sections: document.getElementById('allowsMultipleSections').checked,
            is_active: document.getElementById('isActive').checked
        };

        const url = currentEditId ? `${API_BASE}/${currentEditId}` : `${API_BASE}/`;
        const method = currentEditId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.status === 'success') {
            showAlert(result.message, 'success');
            resetForm();
            await loadExamTypes();
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving MSE exam type:', error);
        showAlert('Failed to save MSE exam type', 'error');
    }
}

/**
 * Edit MSE exam type
 */
function editExamType(id) {
    const examType = allExamTypes.find(et => et.exam_type_id === id);
    if (!examType) return;

    currentEditId = id;
    
    // Populate form
    document.getElementById('examTypeCode').value = examType.exam_type_code;
    document.getElementById('examTypeName').value = examType.exam_type_name;
    document.getElementById('examCategory').value = examType.exam_category;
    document.getElementById('description').value = examType.description || '';
    document.getElementById('maxMarks').value = examType.max_marks;
    document.getElementById('durationMinutes').value = examType.duration_minutes;
    document.getElementById('gapRequiredMinutes').value = examType.gap_required_minutes;
    document.getElementById('requiresInvigilator').checked = examType.requires_invigilator;
    document.getElementById('allowsMultipleSections').checked = examType.allows_multiple_sections;
    document.getElementById('isActive').checked = examType.is_active;
    
    // Update button text
    document.getElementById('submitBtnText').textContent = 'Update Exam Type';
    
    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Delete MSE exam type
 */
async function deleteExamType(id) {
    if (!confirm('Are you sure you want to delete this MSE exam type? This action can be restored.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.status === 'success') {
            showAlert(result.message, 'success');
            await loadExamTypes();
        } else {
            showAlert(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting MSE exam type:', error);
        showAlert('Failed to delete MSE exam type', 'error');
    }
}

/**
 * Reset form
 */
function resetForm() {
    document.getElementById('mseExamTypeForm').reset();
    currentEditId = null;
    document.getElementById('submitBtnText').textContent = 'Add Exam Type';
}

// =====================================================
// CONFIGURATION MANAGEMENT
// =====================================================

/**
 * Load MSE configuration
 */
async function loadConfiguration() {
    try {
        showLoading('configurationForm');
        const response = await fetch(`${API_BASE}/config/all`);
        const result = await response.json();

        if (result.status === 'success') {
            allConfigurations = result.data;
            displayConfiguration(result.data);
        } else {
            showError('configurationForm', result.message);
        }
    } catch (error) {
        console.error('Error loading MSE configuration:', error);
        showError('configurationForm', 'Failed to load MSE configuration');
    }
}

/**
 * Display configuration form
 */
function displayConfiguration(configs) {
    const container = document.getElementById('configurationForm');
    
    const configHTML = `
        <form id="mseConfigForm">
            ${configs.map(config => `
                <div class="form-group">
                    <label for="config_${config.config_key}">${config.description}</label>
                    ${config.config_type === 'BOOLEAN' ? 
                        `<select id="config_${config.config_key}">
                            <option value="true" ${config.config_value === 'true' ? 'selected' : ''}>True</option>
                            <option value="false" ${config.config_value === 'false' ? 'selected' : ''}>False</option>
                        </select>` :
                        config.config_type === 'NUMBER' ?
                        `<input type="number" id="config_${config.config_key}" value="${config.config_value}">` :
                        `<input type="text" id="config_${config.config_key}" value="${config.config_value}">`
                    }
                    <small><strong>Key:</strong> ${config.config_key} | <strong>Type:</strong> ${config.config_type}</small>
                </div>
            `).join('')}
            
            <div class="actions">
                <button type="submit" class="btn btn-primary">Update Configuration</button>
            </div>
        </form>
    `;
    
    container.innerHTML = configHTML;
    
    // Setup form handler
    document.getElementById('mseConfigForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateConfiguration();
    });
}

/**
 * Update MSE configuration
 */
async function updateConfiguration() {
    try {
        const updates = [];
        
        allConfigurations.forEach(config => {
            const element = document.getElementById(`config_${config.config_key}`);
            if (element) {
                updates.push({
                    key: config.config_key,
                    value: element.value
                });
            }
        });

        // Update each configuration
        for (const update of updates) {
            await fetch(`${API_BASE}/config/${update.key}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config_value: update.value })
            });
        }

        showAlert('MSE configuration updated successfully', 'success');
    } catch (error) {
        console.error('Error updating MSE configuration:', error);
        showAlert('Failed to update MSE configuration', 'error');
    }
}

// =====================================================
// TEMPLATE MANAGEMENT
// =====================================================

/**
 * Load MSE templates
 */
async function loadTemplates() {
    try {
        showLoading('templatesForm');
        // TODO: Implement template loading when API is ready
        const container = document.getElementById('templatesForm');
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #666;">
                <p>Template management will be implemented in the next phase.</p>
                <p>This will include notification templates for MSE announcements, schedules, and results.</p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading MSE templates:', error);
        showError('templatesForm', 'Failed to load MSE templates');
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Show loading state
 */
function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading...</p>
        </div>
    `;
}

/**
 * Show error state
 */
function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="alert alert-error">
            <p><strong>Error:</strong> ${message}</p>
        </div>
    `;
}

/**
 * Show alert message
 */
function showAlert(message, type = 'info') {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(alert);
    
    // Remove after 3 seconds
    setTimeout(() => {
        alert.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(alert);
        }, 300);
    }, 3000);
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
