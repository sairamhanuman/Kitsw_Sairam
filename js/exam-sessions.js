// Exam Session Management JavaScript

const API_BASE_URL = window.location.origin;
let currentEditId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadExamSessions();
    setupFormSubmit();
});

// Setup form submit handler
function setupFormSubmit() {
    const form = document.getElementById('examSessionForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveExamSession();
    });
}

// Load all exam sessions
async function loadExamSessions() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/exam-sessions`);
        const result = await response.json();
        
        if (response.ok) {
            displayExamSessions(result.data || []);
        } else {
            showAlert(result.message || 'Failed to load exam sessions', 'danger');
            displayExamSessions([]);
        }
    } catch (error) {
        console.error('Error loading exam sessions:', error);
        showAlert('Error connecting to server: ' + error.message, 'danger');
        displayExamSessions([]);
    }
}

// Display exam sessions in table
function displayExamSessions(sessions) {
    const tableContainer = document.getElementById('tableContainer');
    
    if (sessions.length === 0) {
        tableContainer.innerHTML = `
            <div class="alert alert-info">
                No exam sessions found. Add your first exam session using the form above.
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Session Name</th>
                    <th>Exam Date</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sessions.forEach(session => {
        const statusClass = session.is_active ? 'status-active' : 'status-inactive';
        const statusText = session.is_active ? 'Active' : 'Inactive';
        const examDate = `${session.exam_month}/${session.exam_year}`;
        
        tableHTML += `
            <tr>
                <td><strong>${escapeHtml(session.session_name)}</strong></td>
                <td>${examDate}</td>
                <td>${escapeHtml(session.session_code)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editExamSession(${session.exam_session_id})">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExamSession(${session.exam_session_id}, '${escapeHtml(session.session_name)}')">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    tableContainer.innerHTML = tableHTML;
}

// Save exam session (Create or Update)
async function saveExamSession() {
    const examDate = document.getElementById('examDate').value;
    const examDateObj = new Date(examDate);
    
    const formData = {
        session_code: document.getElementById('sessionType').value.trim().toUpperCase().replace(/\s+/g, '_'),
        session_name: document.getElementById('sessionName').value.trim(),
        exam_month: examDateObj.getMonth() + 1,
        exam_year: examDateObj.getFullYear(),
        start_date: examDate,
        end_date: examDate,
        is_active: true
    };
    
    // Validation
    if (!formData.session_name || !examDate || !document.getElementById('sessionType').value.trim()) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    try {
        let response;
        if (currentEditId) {
            // Update existing exam session
            response = await fetch(`${API_BASE_URL}/api/exam-sessions/${currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new exam session
            response = await fetch(`${API_BASE_URL}/api/exam-sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message || 'Exam session saved successfully', 'success');
            resetForm();
            loadExamSessions();
        } else {
            showAlert(result.message || 'Failed to save exam session', 'danger');
        }
    } catch (error) {
        console.error('Error saving exam session:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Edit exam session
async function editExamSession(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/exam-sessions/${id}`);
        const result = await response.json();
        
        if (response.ok && result.data) {
            const session = result.data;
            
            // Populate form
            document.getElementById('sessionId').value = session.exam_session_id;
            document.getElementById('sessionName').value = session.session_name;
            document.getElementById('sessionType').value = session.session_code || '';
            const examDate = session.start_date ? session.start_date.split('T')[0] : '';
            document.getElementById('examDate').value = examDate;
            
            // Update form title and button
            document.getElementById('formTitle').textContent = 'Edit Exam Session';
            document.getElementById('submitBtnText').textContent = 'Update Exam Session';
            
            // Disable type field during edit
            document.getElementById('sessionType').disabled = true;
            
            currentEditId = id;
            
            // Scroll to form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showAlert('Failed to load exam session details', 'danger');
        }
    } catch (error) {
        console.error('Error loading exam session:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Delete exam session
async function deleteExamSession(id, name) {
    if (!confirm(`Are you sure you want to delete exam session "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/exam-sessions/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message || 'Exam session deleted successfully', 'success');
            loadExamSessions();
        } else {
            showAlert(result.message || 'Failed to delete exam session', 'danger');
        }
    } catch (error) {
        console.error('Error deleting exam session:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Reset form
function resetForm() {
    document.getElementById('examSessionForm').reset();
    document.getElementById('sessionId').value = '';
    document.getElementById('sessionType').disabled = false;
    document.getElementById('formTitle').textContent = 'Add New Exam Session';
    document.getElementById('submitBtnText').textContent = 'Add Exam Session';
    currentEditId = null;
}

// Show alert message
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
    
    // Scroll to top to show alert
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text ? String(text).replace(/[&<>"']/g, m => map[m]) : '';
}
