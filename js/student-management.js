// Student Management JavaScript

const API_BASE_URL = window.location.origin;
let currentEditId = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    loadProgrammes();
    loadBranches();
    loadBatches();
    loadRegulations();
    loadSections();
    loadStudents();
    setupFormSubmit();
});

// Setup form submit handler
function setupFormSubmit() {
    const form = document.getElementById('studentForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveStudent();
    });
}

// Load programmes for dropdown
async function loadProgrammes() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/programmes`);
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('programmeId');
            select.innerHTML = '<option value="">Select Programme</option>';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(programme => {
                    if (programme.is_active) {
                        const option = document.createElement('option');
                        option.value = programme.programme_id;
                        option.textContent = `${programme.programme_code} - ${programme.programme_name}`;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading programmes:', error);
    }
}

// Load branches for dropdown
async function loadBranches() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/branches`);
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('branchId');
            select.innerHTML = '<option value="">Select Branch</option>';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(branch => {
                    if (branch.is_active) {
                        const option = document.createElement('option');
                        option.value = branch.branch_id;
                        option.textContent = `${branch.branch_code} - ${branch.branch_name}`;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// Load batches for dropdown
async function loadBatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/batches`);
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('batchId');
            select.innerHTML = '<option value="">Select Batch</option>';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(batch => {
                    if (batch.is_active) {
                        const option = document.createElement('option');
                        option.value = batch.batch_id;
                        option.textContent = batch.batch_name;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

// Load regulations for dropdown
async function loadRegulations() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/regulations`);
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('regulationId');
            select.innerHTML = '<option value="">Select Regulation</option>';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(regulation => {
                    if (regulation.is_active) {
                        const option = document.createElement('option');
                        option.value = regulation.regulation_id;
                        option.textContent = `${regulation.regulation_name} (${regulation.regulation_year})`;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading regulations:', error);
    }
}

// Load sections for dropdown
async function loadSections() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sections`);
        const result = await response.json();
        
        if (response.ok) {
            const select = document.getElementById('sectionId');
            select.innerHTML = '<option value="">Select Section</option>';
            
            if (result.data && result.data.length > 0) {
                result.data.forEach(section => {
                    if (section.is_active) {
                        const option = document.createElement('option');
                        option.value = section.section_id;
                        option.textContent = section.section_name;
                        select.appendChild(option);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error loading sections:', error);
    }
}

// Load all students
async function loadStudents() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students`);
        const result = await response.json();
        
        if (response.ok) {
            displayStudents(result.data || []);
        } else {
            showAlert(result.message || 'Failed to load students', 'danger');
            displayStudents([]);
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showAlert('Error connecting to server: ' + error.message, 'danger');
        displayStudents([]);
    }
}

// Display students in table
function displayStudents(students) {
    const tableContainer = document.getElementById('tableContainer');
    
    if (students.length === 0) {
        tableContainer.innerHTML = `
            <div class="alert alert-info">
                No students found. Add your first student using the form above.
            </div>
        `;
        return;
    }
    
    let tableHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Student Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Batch</th>
                    <th>Branch</th>
                    <th>Section</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    students.forEach(student => {
        const statusClass = student.is_active ? 'status-active' : 'status-inactive';
        const statusText = student.is_active ? 'Active' : 'Inactive';
        const fullName = `${student.first_name} ${student.last_name}`;
        
        tableHTML += `
            <tr>
                <td><strong>${escapeHtml(fullName)}</strong></td>
                <td>${escapeHtml(student.email || 'N/A')}</td>
                <td>${escapeHtml(student.phone || 'N/A')}</td>
                <td>${escapeHtml(student.batch_name || 'N/A')}</td>
                <td>${escapeHtml(student.branch_name || 'N/A')}</td>
                <td>${escapeHtml(student.section_name || 'N/A')}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editStudent(${student.student_id})">
                            Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteStudent(${student.student_id}, '${escapeHtml(fullName)}')">
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

// Save student (Create or Update)
async function saveStudent() {
    const formData = {
        roll_number: document.getElementById('rollNumber').value.trim().toUpperCase(),
        first_name: document.getElementById('firstName').value.trim(),
        last_name: document.getElementById('lastName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date_of_birth: document.getElementById('dateOfBirth').value,
        admission_year: parseInt(document.getElementById('admissionYear').value),
        programme_id: parseInt(document.getElementById('programmeId').value),
        branch_id: parseInt(document.getElementById('branchId').value),
        batch_id: parseInt(document.getElementById('batchId').value),
        regulation_id: parseInt(document.getElementById('regulationId').value),
        section_id: parseInt(document.getElementById('sectionId').value),
        current_semester: parseInt(document.getElementById('currentSemester').value),
        address: document.getElementById('address').value.trim(),
        is_active: document.getElementById('isActive').checked
    };
    
    // Validation
    if (!formData.roll_number || !formData.first_name || !formData.last_name || 
        !formData.admission_year || !formData.programme_id || !formData.branch_id || 
        !formData.batch_id || !formData.regulation_id || !formData.section_id) {
        showAlert('Please fill in all required fields', 'danger');
        return;
    }
    
    try {
        let response;
        if (currentEditId) {
            // Update existing student
            response = await fetch(`${API_BASE_URL}/api/students/${currentEditId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        } else {
            // Create new student
            response = await fetch(`${API_BASE_URL}/api/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
        }
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message || 'Student saved successfully', 'success');
            resetForm();
            loadStudents();
        } else {
            showAlert(result.message || 'Failed to save student', 'danger');
        }
    } catch (error) {
        console.error('Error saving student:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Edit student
async function editStudent(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/students/${id}`);
        const result = await response.json();
        
        if (response.ok && result.data) {
            const student = result.data;
            
            // Populate form
            document.getElementById('studentId').value = student.student_id;
            document.getElementById('rollNumber').value = student.roll_number;
            document.getElementById('firstName').value = student.first_name;
            document.getElementById('lastName').value = student.last_name;
            document.getElementById('email').value = student.email || '';
            document.getElementById('phone').value = student.phone || '';
            document.getElementById('dateOfBirth').value = student.date_of_birth ? student.date_of_birth.split('T')[0] : '';
            document.getElementById('admissionYear').value = student.admission_year;
            document.getElementById('programmeId').value = student.programme_id;
            document.getElementById('branchId').value = student.branch_id;
            document.getElementById('batchId').value = student.batch_id;
            document.getElementById('regulationId').value = student.regulation_id;
            document.getElementById('sectionId').value = student.section_id;
            document.getElementById('currentSemester').value = student.current_semester || 1;
            document.getElementById('address').value = student.address || '';
            document.getElementById('isActive').checked = student.is_active;
            
            // Update form title and button
            document.getElementById('formTitle').textContent = 'Edit Student';
            document.getElementById('submitBtnText').textContent = 'Update Student';
            
            // Disable roll number field during edit
            document.getElementById('rollNumber').disabled = true;
            
            currentEditId = id;
            
            // Scroll to form
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            showAlert('Failed to load student details', 'danger');
        }
    } catch (error) {
        console.error('Error loading student:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Delete student
async function deleteStudent(id, name) {
    if (!confirm(`Are you sure you want to delete student "${name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showAlert(result.message || 'Student deleted successfully', 'success');
            loadStudents();
        } else {
            showAlert(result.message || 'Failed to delete student', 'danger');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showAlert('Error: ' + error.message, 'danger');
    }
}

// Reset form
function resetForm() {
    document.getElementById('studentForm').reset();
    document.getElementById('studentId').value = '';
    document.getElementById('rollNumber').disabled = false;
    document.getElementById('formTitle').textContent = 'Add New Student';
    document.getElementById('submitBtnText').textContent = 'Add Student';
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
