/**
 * Exam Timetable Management JavaScript
 * Comprehensive frontend functionality for exam timetable system
 */

// Global variables
let currentTimetables = [];
let currentSchedules = [];
let currentConflicts = [];
let currentInvigilators = [];
let currentCalendarDate = new Date();

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    loadMasterData();
    loadTimetables();
    initializeFormHandlers();
    initializeCalendar();
});

// =====================================================
// TAB MANAGEMENT
// =====================================================

function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked button and corresponding content
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
            
            // Load tab-specific data
            loadTabData(targetTab);
        });
    });
}

function loadTabData(tabName) {
    switch(tabName) {
        case 'timetable':
            loadTimetables();
            break;
        case 'calendar':
            renderCalendar();
            break;
        case 'conflicts':
            loadConflicts();
            break;
        case 'invigilators':
            loadInvigilators();
            break;
        case 'reports':
            initializeReports();
            break;
    }
}

// =====================================================
// MASTER DATA LOADING
// =====================================================

async function loadMasterData() {
    try {
        // Load programmes
        try {
            const programmesResponse = await fetch('/api/programmes');
            const programmesData = await programmesResponse.json();
            populateSelect('filterProgramme', programmesData.data || [], 'programme_id', 'programme_name');
            populateSelect('programmeSelect', programmesData.data || [], 'programme_id', 'programme_name');
        } catch (error) {
            console.warn('Failed to load programmes:', error);
        }

        // Load branches
        try {
            const branchesResponse = await fetch('/api/branches');
            const branchesData = await branchesResponse.json();
            populateSelect('filterBranch', branchesData.data || [], 'branch_id', 'branch_name');
            populateSelect('branchSelect', branchesData.data || [], 'branch_id', 'branch_name');
        } catch (error) {
            console.warn('Failed to load branches:', error);
        }

        // Load semesters
        try {
            const semestersResponse = await fetch('/api/semesters');
            const semestersData = await semestersResponse.json();
            populateSelect('filterSemester', semestersData.data || [], 'semester_id', 'semester_name');
            populateSelect('semesterSelect', semestersData.data || [], 'semester_id', 'semester_name');
        } catch (error) {
            console.warn('Failed to load semesters:', error);
        }

        // Load exam sessions
        try {
            const examSessionsResponse = await fetch('/api/exam-sessions');
            const examSessionsData = await examSessionsResponse.json();
            populateSelect('examSession', examSessionsData.data || [], 'exam_session_id', 'exam_session_name');
        } catch (error) {
            console.warn('Failed to load exam sessions:', error);
            // Add fallback option
            const examSessionSelect = document.getElementById('examSession');
            if (examSessionSelect) {
                const option = document.createElement('option');
                option.value = '1';
                option.textContent = 'MSE - Mid Semester Examination';
                examSessionSelect.appendChild(option);
            }
        }

        // Load MSE exam types
        try {
            const examTypesResponse = await fetch('/api/mse-exam-types');
            const examTypesData = await examTypesResponse.json();
            populateSelect('examType', examTypesData.data || [], 'exam_type_id', 'exam_type_name');
        } catch (error) {
            console.warn('Failed to load MSE exam types:', error);
            // Add fallback options
            const examTypeSelect = document.getElementById('examType');
            if (examTypeSelect) {
                const options = [
                    { value: '1', text: 'MSE - I' },
                    { value: '2', text: 'MSE - II' },
                    { value: '3', text: 'Lab Examination' }
                ];
                options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    examTypeSelect.appendChild(option);
                });
            }
        }

    } catch (error) {
        console.error('Error loading master data:', error);
        showAlert('Some master data could not be loaded. Please check your database connection.', 'warning');
    }
}

function populateSelect(selectId, data, valueField, textField) {
    const select = document.getElementById(selectId);
    if (!select) return;

    // Keep the first option (usually "All..." or "Select...")
    const firstOption = select.options[0];
    select.innerHTML = '';
    if (firstOption) {
        select.appendChild(firstOption);
    }

    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueField];
        option.textContent = item[textField];
        select.appendChild(option);
    });
}

// =====================================================
// TIMETABLE MANAGEMENT
// =====================================================

async function loadTimetables() {
    try {
        showLoading('timetablesTableBody');
        
        const response = await fetch('/api/exam-timetable');
        const result = await response.json();
        
        if (result.status === 'success') {
            currentTimetables = result.data;
            updateStatistics(result.statistics);
            renderTimetables(result.data);
        } else {
            showAlert('Failed to load timetables', 'error');
        }
    } catch (error) {
        console.error('Error loading timetables:', error);
        showAlert('Failed to load timetables', 'error');
    }
}

function renderTimetables(timetables) {
    const tbody = document.getElementById('timetablesTableBody');
    if (!tbody) return;

    if (timetables.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="empty-state">
                        <h3>No timetables found</h3>
                        <p>Create your first exam timetable to get started</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = timetables.map(timetable => `
        <tr>
            <td>
                <strong>${timetable.exam_name}</strong>
                <br>
                <small class="text-muted">${timetable.exam_type_name || 'N/A'}</small>
            </td>
            <td>${timetable.programme_name || 'N/A'}</td>
            <td>${timetable.branch_name || 'N/A'}</td>
            <td>${timetable.semester_name || 'N/A'}</td>
            <td>
                <div>${formatDate(timetable.start_date)} - ${formatDate(timetable.end_date)}</div>
                <small class="text-muted">${timetable.academic_year}</small>
            </td>
            <td>
                <span class="status-badge status-${timetable.status.toLowerCase()}">
                    ${timetable.status}
                </span>
            </td>
            <td>${formatDateTime(timetable.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewTimetable(${timetable.timetable_id})">
                        👁️ View
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editTimetable(${timetable.timetable_id})">
                        ✏️ Edit
                    </button>
                    ${timetable.status === 'Draft' ? `
                        <button class="btn btn-sm btn-success" onclick="publishTimetable(${timetable.timetable_id})">
                            📤 Publish
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger" onclick="deleteTimetable(${timetable.timetable_id})">
                        🗑️ Delete
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateStatistics(stats) {
    if (!stats) return;

    document.getElementById('totalTimetables').textContent = stats.total || 0;
    document.getElementById('publishedTimetables').textContent = stats.published || 0;
    document.getElementById('draftTimetables').textContent = stats.draft || 0;
    document.getElementById('totalExams').textContent = stats.completed || 0;
}

// =====================================================
// FORM HANDLING
// =====================================================

function initializeFormHandlers() {
    const form = document.getElementById('examScheduleForm');
    if (form) {
        form.addEventListener('submit', handleScheduleSubmit);
    }

    // Date validation
    const startDate = document.getElementById('startDate');
    const endDate = document.getElementById('endDate');
    if (startDate && endDate) {
        startDate.addEventListener('change', validateDates);
        endDate.addEventListener('change', validateDates);
    }

    // Programme-Branch dependency
    const programmeSelect = document.getElementById('programmeSelect');
    const branchSelect = document.getElementById('branchSelect');
    
    if (programmeSelect && branchSelect) {
        programmeSelect.addEventListener('change', async function() {
            await loadBranchesForProgramme(this.value);
        });
        
        // Initially load branches for first programme
        if (programmeSelect.value) {
            loadBranchesForProgramme(programmeSelect.value);
        }
    }

    // Multi-semester selection
    const semesterSelect = document.getElementById('semesterSelect');
    if (semesterSelect) {
        semesterSelect.multiple = true;
        semesterSelect.size = 4;
        
        // Add label for multi-selection
        const label = semesterSelect.previousElementSibling;
        if (label && label.tagName === 'LABEL') {
            label.textContent = 'Semesters (Hold Ctrl/Cmd to select multiple)';
        }
    }
}

async function loadBranchesForProgramme(programmeId) {
    const branchSelect = document.getElementById('branchSelect');
    if (!branchSelect || !programmeId) return;

    try {
        const response = await fetch(`/api/branches?programme_id=${programmeId}`);
        const data = await response.json();
        
        // Keep the first option
        const firstOption = branchSelect.options[0];
        branchSelect.innerHTML = '';
        if (firstOption) {
            branchSelect.appendChild(firstOption);
        }
        
        // Add filtered branches
        (data.data || []).forEach(branch => {
            const option = document.createElement('option');
            option.value = branch.branch_id;
            option.textContent = branch.branch_name;
            branchSelect.appendChild(option);
        });
        
    } catch (error) {
        console.warn('Failed to load branches for programme:', error);
    }
}

async function handleScheduleSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    
    try {
        showLoading();
        
        const response = await fetch('/api/exam-timetable', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Exam timetable created successfully!', 'success');
            resetScheduleForm();
            loadTimetables();
            
            // Switch to timetable tab
            document.querySelector('[data-tab="timetable"]').click();
        } else {
            showAlert(result.message || 'Failed to create timetable', 'error');
        }
    } catch (error) {
        console.error('Error creating timetable:', error);
        showAlert('Failed to create timetable', 'error');
    } finally {
        hideLoading();
    }
}

function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        showAlert('Start date cannot be after end date', 'error');
        document.getElementById('endDate').value = '';
    }
}

function resetScheduleForm() {
    const form = document.getElementById('examScheduleForm');
    if (form) {
        form.reset();
    }
}

function saveAsDraft() {
    const form = document.getElementById('examScheduleForm');
    if (form) {
        // Add a hidden field or modify form submission to save as draft
        const statusInput = document.createElement('input');
        statusInput.type = 'hidden';
        statusInput.name = 'status';
        statusInput.value = 'Draft';
        form.appendChild(statusInput);
        
        form.dispatchEvent(new Event('submit'));
    }
}

// =====================================================
// TIMETABLE ACTIONS
// =====================================================

async function viewTimetable(timetableId) {
    try {
        const response = await fetch(`/api/exam-timetable/${timetableId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            showTimetableModal(result.data);
        } else {
            showAlert('Failed to load timetable details', 'error');
        }
    } catch (error) {
        console.error('Error viewing timetable:', error);
        showAlert('Failed to load timetable details', 'error');
    }
}

async function editTimetable(timetableId) {
    try {
        const response = await fetch(`/api/exam-timetable/${timetableId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            populateEditForm(result.data);
            
            // Switch to schedule tab and populate form
            document.querySelector('[data-tab="schedule"]').click();
            
            // Scroll to form
            document.getElementById('examScheduleForm').scrollIntoView({ behavior: 'smooth' });
        } else {
            showAlert('Failed to load timetable for editing', 'error');
        }
    } catch (error) {
        console.error('Error editing timetable:', error);
        showAlert('Failed to load timetable for editing', 'error');
    }
}

function populateEditForm(timetable) {
    const form = document.getElementById('examScheduleForm');
    if (!form) return;

    // Populate form fields
    Object.keys(timetable).forEach(key => {
        const field = form.querySelector(`[name="${key}"], #${key}`);
        if (field) {
            if (field.type === 'date') {
                field.value = timetable[key] ? timetable[key].split('T')[0] : '';
            } else if (field.type === 'checkbox') {
                field.checked = timetable[key] === 1 || timetable[key] === true;
            } else {
                field.value = timetable[key] || '';
            }
        }
    });

    // Add hidden field for update
    let hiddenField = form.querySelector('input[name="timetable_id"]');
    if (!hiddenField) {
        hiddenField = document.createElement('input');
        hiddenField.type = 'hidden';
        hiddenField.name = 'timetable_id';
        form.appendChild(hiddenField);
    }
    hiddenField.value = timetable.timetable_id;
}

async function publishTimetable(timetableId) {
    if (!confirm('Are you sure you want to publish this timetable? This will make it visible to students and faculty.')) {
        return;
    }

    try {
        const response = await fetch(`/api/exam-timetable/${timetableId}/publish`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ approved_by: 1 }) // TODO: Get from authenticated user
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Timetable published successfully!', 'success');
            loadTimetables();
        } else {
            showAlert(result.message || 'Failed to publish timetable', 'error');
        }
    } catch (error) {
        console.error('Error publishing timetable:', error);
        showAlert('Failed to publish timetable', 'error');
    }
}

async function deleteTimetable(timetableId) {
    if (!confirm('Are you sure you want to delete this timetable? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/exam-timetable/${timetableId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Timetable deleted successfully!', 'success');
            loadTimetables();
        } else {
            showAlert(result.message || 'Failed to delete timetable', 'error');
        }
    } catch (error) {
        console.error('Error deleting timetable:', error);
        showAlert('Failed to delete timetable', 'error');
    }
}

// =====================================================
// CALENDAR VIEW
// =====================================================

function initializeCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update month header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let calendarHTML = '';
    
    // Day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayExams = getExamsForDate(dateStr);
        
        const hasExamClass = dayExams.length > 0 ? 'has-exam' : '';
        
        calendarHTML += `
            <div class="calendar-day ${hasExamClass}">
                <div class="calendar-day-header">${day}</div>
                ${dayExams.map(exam => `
                    <div class="calendar-exam-item" onclick="viewExamDetails('${exam.schedule_id}')">
                        ${exam.exam_name}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    calendarGrid.innerHTML = calendarHTML;
}

function getExamsForDate(date) {
    // Filter exams for the given date
    return currentSchedules.filter(schedule => 
        schedule.exam_date === date
    );
}

function previousMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
}

function currentMonth() {
    currentCalendarDate = new Date();
    renderCalendar();
}

// =====================================================
// CONFLICT DETECTION
// =====================================================

async function loadConflicts() {
    try {
        showLoading('conflictsTableBody');
        
        // Get conflicts for the first timetable (or implement selection)
        const timetableId = currentTimetables.length > 0 ? currentTimetables[0].timetable_id : null;
        
        if (!timetableId) {
            document.getElementById('conflictsTableBody').innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <div class="empty-state">
                            <h3>No timetables available</h3>
                            <p>Create a timetable first to detect conflicts</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        const response = await fetch(`/api/exam-timetable/${timetableId}/conflicts`);
        const result = await response.json();
        
        if (result.status === 'success') {
            currentConflicts = result.data;
            renderConflicts(result.data);
        } else {
            showAlert('Failed to load conflicts', 'error');
        }
    } catch (error) {
        console.error('Error loading conflicts:', error);
        showAlert('Failed to load conflicts', 'error');
    }
}

function renderConflicts(conflicts) {
    const tbody = document.getElementById('conflictsTableBody');
    if (!tbody) return;

    if (conflicts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="empty-state">
                        <h3>✅ No conflicts detected</h3>
                        <p>Your timetable is conflict-free!</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = conflicts.map(conflict => `
        <tr>
            <td>
                <span class="status-badge status-${getConflictSeverity(conflict.conflict_type)}">
                    ${conflict.conflict_type}
                </span>
            </td>
            <td>
                ${formatDate(conflict.exam_date)}<br>
                <small>${conflict.time1_start} - ${conflict.time1_end}</small>
            </td>
            <td>
                ${conflict.room_name || conflict.faculty_name || 'N/A'}
            </td>
            <td>${conflict.conflict_description}</td>
            <td>
                <span class="status-badge status-${getPriorityClass(conflict.priority)}">
                    ${conflict.priority}
                </span>
            </td>
            <td>
                <span class="status-badge status-${getResolutionClass(conflict.resolution_status)}">
                    ${conflict.resolution_status}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-warning" onclick="resolveConflict('${conflict.conflict_id}')">
                        🛠️ Resolve
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function detectConflicts() {
    const timetableId = currentTimetables.length > 0 ? currentTimetables[0].timetable_id : null;
    
    if (!timetableId) {
        showAlert('Please select a timetable first', 'warning');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/exam-timetable/${timetableId}/conflicts`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert(`Conflict detection completed. Found ${result.conflict_count} conflicts.`, 'info');
            loadConflicts();
        } else {
            showAlert(result.message || 'Failed to detect conflicts', 'error');
        }
    } catch (error) {
        console.error('Error detecting conflicts:', error);
        showAlert('Failed to detect conflicts', 'error');
    } finally {
        hideLoading();
    }
}

// =====================================================
// INVIGILATOR MANAGEMENT
// =====================================================

async function loadInvigilators() {
    try {
        showLoading('invigilatorsTableBody');
        
        // This would need to be implemented on the backend
        // For now, show placeholder
        document.getElementById('invigilatorsTableBody').innerHTML = `
            <tr>
                <td colspan="7" class="text-center">
                    <div class="loading">
                        <div class="spinner"></div>
                        <p>Loading invigilators...</p>
                    </div>
                </td>
            </tr>
        `;
        
        showAlert('Invigilator management coming soon!', 'info');
    } catch (error) {
        console.error('Error loading invigilators:', error);
        showAlert('Failed to load invigilators', 'error');
    }
}

async function autoAssignInvigilators() {
    const timetableId = currentTimetables.length > 0 ? currentTimetables[0].timetable_id : null;
    
    if (!timetableId) {
        showAlert('Please select a timetable first', 'warning');
        return;
    }

    try {
        showLoading();
        
        const response = await fetch(`/api/exam-timetable/${timetableId}/auto-assign-invigilators`, {
            method: 'POST'
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert(`Successfully assigned ${result.data.assignments_made} invigilators!`, 'success');
            loadInvigilators();
        } else {
            showAlert(result.message || 'Failed to assign invigilators', 'error');
        }
    } catch (error) {
        console.error('Error assigning invigilators:', error);
        showAlert('Failed to assign invigilators', 'error');
    } finally {
        hideLoading();
    }
}

// =====================================================
// REPORTS
// =====================================================

function initializeReports() {
    // Initialize report functionality
    const reportType = document.getElementById('reportType');
    const reportFormat = document.getElementById('reportFormat');
    
    if (reportType && reportFormat) {
        reportType.addEventListener('change', updateReportPreview);
        reportFormat.addEventListener('change', updateReportPreview);
    }
}

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const reportFormat = document.getElementById('reportFormat').value;
    
    if (!reportType) {
        showAlert('Please select a report type', 'warning');
        return;
    }

    try {
        showLoading();
        
        // This would need to be implemented on the backend
        showAlert('Report generation coming soon!', 'info');
        
    } catch (error) {
        console.error('Error generating report:', error);
        showAlert('Failed to generate report', 'error');
    } finally {
        hideLoading();
    }
}

function printTimetable() {
    window.print();
}

function exportTimetable() {
    // Export functionality
    showAlert('Export functionality coming soon!', 'info');
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
        <span>${getAlertIcon(type)}</span>
        <span>${message}</span>
    `;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function getAlertIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function showLoading(containerId = null) {
    if (containerId) {
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = `
                <tr>
                    <td colspan="8" class="loading">
                        <div class="spinner"></div>
                        <p>Loading...</p>
                    </td>
                </tr>
            `;
        }
    } else {
        // Global loading overlay
        const overlay = document.createElement('div');
        overlay.id = 'globalLoadingOverlay';
        overlay.className = 'loading-overlay active';
        overlay.innerHTML = `
            <div class="spinner"></div>
            <p>Processing...</p>
        `;
        document.body.appendChild(overlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('globalLoadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getConflictSeverity(conflictType) {
    const severities = {
        'Room Clash': 'danger',
        'Faculty Clash': 'warning',
        'Student Clash': 'danger',
        'Time Clash': 'warning',
        'Resource Clash': 'info'
    };
    return severities[conflictType] || 'info';
}

function getPriorityClass(priority) {
    const classes = {
        'Low': 'info',
        'Medium': 'warning',
        'High': 'danger',
        'Critical': 'danger'
    };
    return classes[priority] || 'info';
}

function getResolutionClass(status) {
    const classes = {
        'Pending': 'warning',
        'Resolved': 'success',
        'Escalated': 'danger',
        'Ignored': 'secondary'
    };
    return classes[status] || 'info';
}

function applyFilters() {
    // Apply filters to timetables
    const programme = document.getElementById('filterProgramme').value;
    const branch = document.getElementById('filterBranch').value;
    const semester = document.getElementById('filterSemester').value;
    const status = document.getElementById('filterStatus').value;
    
    let filtered = currentTimetables;
    
    if (programme) {
        filtered = filtered.filter(t => t.programme_id == programme);
    }
    if (branch) {
        filtered = filtered.filter(t => t.branch_id == branch);
    }
    if (semester) {
        filtered = filtered.filter(t => t.semester_id == semester);
    }
    if (status) {
        filtered = filtered.filter(t => t.status === status);
    }
    
    renderTimetables(filtered);
}

function showTimetableModal(timetable) {
    const modal = document.getElementById('editModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    
    if (!modal || !modalTitle || !modalBody) return;
    
    modalTitle.textContent = 'Timetable Details';
    
    modalBody.innerHTML = `
        <div class="form-section">
            <h3>📋 ${timetable.exam_name}</h3>
            <div class="form-grid">
                <div class="form-group">
                    <label>Programme</label>
                    <input type="text" value="${timetable.programme_name || 'N/A'}" readonly>
                </div>
                <div class="form-group">
                    <label>Branch</label>
                    <input type="text" value="${timetable.branch_name || 'N/A'}" readonly>
                </div>
                <div class="form-group">
                    <label>Semester</label>
                    <input type="text" value="${timetable.semester_name || 'N/A'}" readonly>
                </div>
                <div class="form-group">
                    <label>Academic Year</label>
                    <input type="text" value="${timetable.academic_year || 'N/A'}" readonly>
                </div>
                <div class="form-group">
                    <label>Exam Period</label>
                    <input type="text" value="${formatDate(timetable.start_date)} - ${formatDate(timetable.end_date)}" readonly>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <input type="text" value="${timetable.status}" readonly>
                </div>
            </div>
            ${timetable.remarks ? `
                <div class="form-group">
                    <label>Remarks</label>
                    <textarea rows="3" readonly>${timetable.remarks}</textarea>
                </div>
            ` : ''}
            ${timetable.schedules && timetable.schedules.length > 0 ? `
                <h4>📝 Exam Schedules</h4>
                <div class="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Subject</th>
                                <th>Room</th>
                                <th>Invigilator</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${timetable.schedules.map(schedule => `
                                <tr>
                                    <td>${formatDate(schedule.exam_date)}</td>
                                    <td>${schedule.start_time} - ${schedule.end_time}</td>
                                    <td>${schedule.subject_name || 'N/A'}</td>
                                    <td>${schedule.room_name || 'N/A'}</td>
                                    <td>${schedule.chief_invigilator_name || 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : ''}
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (modal && event.target === modal) {
        closeModal();
    }
}
