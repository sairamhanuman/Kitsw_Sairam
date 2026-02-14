// Create Exam Notification JavaScript
let currentNotification = null;
let masterData = {
    examNames: [],
    sessions: [],
    monthYears: []
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializeMultiSelect();
    loadMasterData();
    generateNotificationId();
    
    // Form change handlers
    document.getElementById('examType').addEventListener('change', loadExamNames);
    document.getElementById('startDate').addEventListener('change', validateDates);
    document.getElementById('endDate').addEventListener('change', validateDates);
});

// Load exam names based on exam type selection
function loadExamNames() {
    const examType = document.getElementById('examType').value;
    const examNameSelect = document.getElementById('examName');
    
    examNameSelect.innerHTML = '<option value="">Select Exam Name</option>';
    
    if (!examType) return;

    // Filter exams based on exam type
    const filteredExams = masterData.examNames.filter(exam => 
        exam.exam_code.toLowerCase().includes(examType.toLowerCase()) ||
        exam.exam_type.toLowerCase().includes(examType.toLowerCase())
    );

    filteredExams.forEach(exam => {
        const option = document.createElement('option');
        option.value = exam.exam_naming_id;
        option.textContent = `${exam.exam_name} (${exam.exam_code})`;
        examNameSelect.appendChild(option);
    });
}

// Initialize multi-select dropdowns
function initializeMultiSelect() {
    $('.multi-select').select2({
        placeholder: 'Select options',
        allowClear: true,
        width: '100%'
    });
}

// Generate unique notification ID
function generateNotificationId() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const notificationId = `NOT-${year}-${random}`;
    document.getElementById('notificationId').textContent = notificationId;
    return notificationId;
}

// Load master data from API
async function loadMasterData() {
    console.log('🔄 Loading master data...');
    try {
        // Load exam names
        console.log('📚 Loading exam names...');
        const examNamesResponse = await fetch('/api/exam-naming-master');
        const examNamesResult = await examNamesResponse.json();
        if (examNamesResult.status === 'success') {
            masterData.examNames = examNamesResult.data;
            console.log('✅ Exam names loaded:', examNamesResult.data.length, 'items');
        } else {
            console.error('❌ Failed to load exam names:', examNamesResult.message);
        }

        // Load sessions from exam_session_master (not sessions_master)
        console.log('🕐 Loading sessions...');
        const sessionsResponse = await fetch('/api/exam-sessions');
        const sessionsResult = await sessionsResponse.json();
        if (sessionsResult.status === 'success') {
            masterData.sessions = sessionsResult.data;
            console.log('✅ Sessions loaded:', sessionsResult.data.length, 'items');
            populateSessions();
        } else {
            console.error('❌ Failed to load sessions:', sessionsResult.message);
        }

        // Load month/year
        console.log('📅 Loading month/year...');
        const monthYearResponse = await fetch('/api/month-year-master');
        const monthYearResult = await monthYearResponse.json();
        if (monthYearResult.status === 'success') {
            masterData.monthYears = monthYearResult.data;
            console.log('✅ Month/Year loaded:', monthYearResult.data.length, 'items');
            populateMonthYears();
        } else {
            console.error('❌ Failed to load month/year:', monthYearResult.message);
        }

        // Load programmes
        console.log('🎓 Loading programmes...');
        const programmesResponse = await fetch('/api/programmes');
        const programmesResult = await programmesResponse.json();
        if (programmesResult.status === 'success') {
            masterData.programmes = programmesResult.data;
            console.log('✅ Programmes loaded:', programmesResult.data.length, 'items');
            populateProgrammes();
        } else {
            console.error('❌ Failed to load programmes:', programmesResult.message);
        }

        // Load batches
        console.log('📦 Loading batches...');
        const batchesResponse = await fetch('/api/batches');
        const batchesResult = await batchesResponse.json();
        if (batchesResult.status === 'success') {
            masterData.batches = batchesResult.data;
            console.log('✅ Batches loaded:', batchesResult.data.length, 'items');
            populateBatches();
        } else {
            console.error('❌ Failed to load batches:', batchesResult.message);
        }

        // Load regulations
        console.log('📋 Loading regulations...');
        const regulationsResponse = await fetch('/api/regulations');
        const regulationsResult = await regulationsResponse.json();
        if (regulationsResult.status === 'success') {
            masterData.regulations = regulationsResult.data;
            console.log('✅ Regulations loaded:', regulationsResult.data.length, 'items');
            populateRegulations();
        } else {
            console.error('❌ Failed to load regulations:', regulationsResult.message);
        }

        console.log('🎉 All master data loaded successfully!');
    } catch (error) {
        console.error('💥 Error loading master data:', error);
        showAlert('Error loading master data', 'error');
    }
}

// Populate programmes dropdown
function populateProgrammes() {
    const programmeSelect = document.getElementById('programmes');
    if (!programmeSelect) return;
    
    masterData.programmes.forEach(programme => {
        if (programme.is_active) {
            const option = document.createElement('option');
            option.value = programme.programme_code;
            option.textContent = `${programme.programme_name} (${programme.programme_code})`;
            programmeSelect.appendChild(option);
        }
    });
}

// Populate batches dropdown
function populateBatches() {
    const batchSelect = document.getElementById('batches');
    if (!batchSelect) return;
    
    masterData.batches.forEach(batch => {
        if (batch.is_active) {
            const option = document.createElement('option');
            option.value = batch.batch_id;
            option.textContent = batch.batch_name;
            batchSelect.appendChild(option);
        }
    });
}

// Populate regulations dropdown
function populateRegulations() {
    const regulationSelect = document.getElementById('regulations');
    if (!regulationSelect) return;
    
    masterData.regulations.forEach(regulation => {
        if (regulation.is_active) {
            const option = document.createElement('option');
            option.value = regulation.regulation_id;
            option.textContent = `${regulation.regulation_name} (${regulation.regulation_year})`;
            regulationSelect.appendChild(option);
        }
    });
}

// Populate sessions dropdown
function populateSessions() {
    const sessionSelect = document.getElementById('session');
    if (!sessionSelect) return;
    
    sessionSelect.innerHTML = '<option value="">Select Session</option>';
    
    masterData.sessions.forEach(session => {
        if (session.is_active) {
            const option = document.createElement('option');
            option.value = session.session_id;
            option.textContent = `${session.session_name} (${session.start_time} - ${session.end_time})`;
            sessionSelect.appendChild(option);
        }
    });
}

// Populate month/year dropdown
function populateMonthYears() {
    const monthYearSelect = document.getElementById('monthYear');
    if (!monthYearSelect) return;
    
    monthYearSelect.innerHTML = '<option value="">Select Month/Year</option>';
    
    masterData.monthYears.forEach(monthYear => {
        if (monthYear.is_active) {
            const option = document.createElement('option');
            option.value = monthYear.month_year_id;
            option.textContent = monthYear.display_name;
            monthYearSelect.appendChild(option);
        }
    });
}

// Validate academic selections
function validateSelections() {
    const programmes = $('#programmes').val();
    const batches = $('#batches').val();
    const semesters = $('#semesters').val();
    const regulations = $('#regulations').val();
    
    let errors = [];
    
    if (!programmes || programmes.length === 0) {
        errors.push('Please select at least one programme');
    }
    
    if (!batches || batches.length === 0) {
        errors.push('Please select at least one batch');
    }
    
    if (!semesters || semesters.length === 0) {
        errors.push('Please select at least one semester');
    }
    
    if (!regulations || regulations.length === 0) {
        errors.push('Please select at least one regulation');
    }
    
    if (errors.length > 0) {
        showAlert(errors.join('<br>'), 'error');
        return false;
    }
    
    showAlert('All selections are valid!', 'success');
    return true;
}

// Validate dates
function validateDates() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    
    if (startDate && endDate) {
        if (new Date(startDate) > new Date(endDate)) {
            showAlert('End date must be after start date', 'error');
            document.getElementById('endDate').value = '';
            return false;
        }
    }
    return true;
}

// Generate timetable
async function generateTimetable() {
    if (!validateSelections()) {
        return;
    }
    
    if (!validateDates()) {
        return;
    }
    
    // First save notification
    const notificationId = await saveNotification(false);
    
    if (notificationId) {
        // Redirect to timetable generation page
        window.location.href = `generate-timetable.html?notification_id=${notificationId}`;
    }
}

// Save notification
async function saveNotification(redirectToView = true) {
    try {
        const notificationData = {
            notification_id: document.getElementById('notificationId').textContent,
            notification_title: document.getElementById('notificationTitle').value,
            description: document.getElementById('notificationDescription').value,
            programmes: JSON.stringify($('#programmes').val() || []),
            batches: JSON.stringify($('#batches').val() || []),
            semesters: JSON.stringify($('#semesters').val() || []),
            regulations: JSON.stringify($('#regulations').val() || []),
            exam_type: document.getElementById('examType').value,
            exam_name_id: document.getElementById('examName').value,
            session_id: document.getElementById('session').value,
            month_year_id: document.getElementById('monthYear').value,
            start_date: document.getElementById('startDate').value,
            end_date: document.getElementById('endDate').value,
            start_time: document.getElementById('startTime').value,
            end_time: document.getElementById('endTime').value,
            status: document.getElementById('status').value,
            created_by: document.getElementById('createdBy').value
        };

        // Validate required fields
        const requiredFields = [
            'notification_title', 'exam_type', 'exam_name_id', 
            'session_id', 'month_year_id', 'start_date', 'end_date'
        ];
        
        for (const field of requiredFields) {
            if (!notificationData[field]) {
                showAlert(`Please fill in all required fields`, 'error');
                return null;
            }
        }

        const response = await fetch('/api/internal-exam/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Notification saved successfully', 'success');
            currentNotification = result.data;
            
            if (redirectToView) {
                setTimeout(() => {
                    window.location.href = 'view-notifications.html';
                }, 2000);
            }
            
            return result.data.notification_id;
        } else {
            showAlert(result.message || 'Failed to save notification', 'error');
            return null;
        }
    } catch (error) {
        console.error('Error saving notification:', error);
        showAlert('Error saving notification', 'error');
        return null;
    }
}

// Clear form
function clearForm() {
    if (confirm('Are you sure you want to clear all form data?')) {
        document.getElementById('notificationForm').reset();
        document.getElementById('academicForm').reset();
        document.getElementById('examConfigForm').reset();
        $('.multi-select').val(null).trigger('change');
        generateNotificationId();
        currentNotification = null;
    }
}

// View notifications
function viewNotifications() {
    window.location.href = 'view-notifications.html';
}

// Show alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '20px';
    alertDiv.style.right = '20px';
    alertDiv.style.zIndex = '9999';
    alertDiv.style.maxWidth = '400px';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Auto-save draft every 30 seconds
setInterval(() => {
    const notificationTitle = document.getElementById('notificationTitle').value;
    if (notificationTitle && document.getElementById('status').value === 'Draft') {
        console.log('Auto-saving draft...');
        // Optional: Implement auto-save functionality
    }
}, 30000);
