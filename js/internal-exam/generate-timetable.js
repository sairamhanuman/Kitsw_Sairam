// Generate Timetable JavaScript
let currentNotification = null;
let timetableData = [];
let unassignedSubjects = [];
let statistics = {
    totalSubjects: 0,
    totalStudents: 0,
    totalSlots: 0,
    assignedSlots: 0
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const notificationId = urlParams.get('notification_id');
    
    if (notificationId) {
        loadNotificationDetails(notificationId);
        document.getElementById('notificationId').textContent = notificationId;
    } else {
        showAlert('No notification ID provided', 'error');
        setTimeout(() => {
            window.location.href = 'create-notification.html';
        }, 2000);
    }
});

// Load notification details
async function loadNotificationDetails(notificationId) {
    try {
        const response = await fetch(`/api/internal-exam/notifications/${notificationId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            currentNotification = result.data;
            displayNotificationInfo();
            populateFilters();
            loadStatistics();
        } else {
            showAlert('Failed to load notification details', 'error');
        }
    } catch (error) {
        console.error('Error loading notification:', error);
        showAlert('Error loading notification details', 'error');
    }
}

// Display notification information
function displayNotificationInfo() {
    const infoHtml = `
        <div class="row">
            <div class="col-md-6">
                <h6><strong>Notification Title:</strong> ${currentNotification.notification_title}</h6>
                <h6><strong>Exam Type:</strong> ${currentNotification.exam_type}</h6>
                <h6><strong>Exam Period:</strong> ${currentNotification.start_date} to ${currentNotification.end_date}</h6>
                <h6><strong>Time:</strong> ${currentNotification.start_time} - ${currentNotification.end_time}</h6>
            </div>
            <div class="col-md-6">
                <h6><strong>Programmes:</strong> ${currentNotification.programmes.join(', ')}</h6>
                <h6><strong>Batches:</strong> ${currentNotification.batches.join(', ')}</h6>
                <h6><strong>Semesters:</strong> ${currentNotification.semesters.join(', ')}</h6>
                <h6><strong>Regulations:</strong> ${currentNotification.regulations.join(', ')}</h6>
            </div>
        </div>
    `;
    
    document.getElementById('notificationInfo').innerHTML = infoHtml;
}

// Populate filter dropdowns
function populateFilters() {
    // Populate programmes filter
    const programmeSelect = document.getElementById('filterProgramme');
    currentNotification.programmes.forEach(programme => {
        const option = document.createElement('option');
        option.value = programme;
        option.textContent = programme;
        programmeSelect.appendChild(option);
    });
    
    // Populate batches filter
    const batchSelect = document.getElementById('filterBatch');
    currentNotification.batches.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch;
        option.textContent = batch;
        batchSelect.appendChild(option);
    });
    
    // Populate semesters filter
    const semesterSelect = document.getElementById('filterSemester');
    currentNotification.semesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester;
        option.textContent = semester;
        semesterSelect.appendChild(option);
    });
    
    // Populate regulations filter
    const regulationSelect = document.getElementById('filterRegulation');
    currentNotification.regulations.forEach(regulation => {
        const option = document.createElement('option');
        option.value = regulation;
        option.textContent = regulation;
        regulationSelect.appendChild(option);
    });
}

// Load statistics
async function loadStatistics() {
    try {
        // This would typically come from an API
        // For now, we'll calculate based on the notification
        statistics.totalSubjects = await calculateTotalSubjects();
        statistics.totalStudents = await calculateTotalStudents();
        statistics.totalSlots = calculateTotalSlots();
        statistics.assignedSlots = 0;
        
        updateStatisticsDisplay();
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Calculate total subjects
async function calculateTotalSubjects() {
    // This would query subject_master based on the notification criteria
    // For now, return a placeholder
    return 25; // Placeholder
}

// Calculate total students
async function calculateTotalStudents() {
    // This would query student_semester_history based on the notification criteria
    // For now, return a placeholder
    return 450; // Placeholder
}

// Calculate total slots
function calculateTotalSlots() {
    const startDate = new Date(currentNotification.start_date);
    const endDate = new Date(currentNotification.end_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Assuming 2 sessions per day (FN and AN)
    return days * 2;
}

// Update statistics display
function updateStatisticsDisplay() {
    document.getElementById('totalSubjects').textContent = statistics.totalSubjects;
    document.getElementById('totalStudents').textContent = statistics.totalStudents;
    document.getElementById('totalSlots').textContent = statistics.totalSlots;
    document.getElementById('assignedSlots').textContent = statistics.assignedSlots;
}

// Generate initial timetable
async function generateInitialTimetable() {
    try {
        showLoading(true);
        
        const response = await fetch(`/api/internal-exam/timetable/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notification_id: currentNotification.notification_id
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            timetableData = result.data.timetable;
            unassignedSubjects = result.data.unassigned_subjects;
            displayTimetable();
            displayUnassignedSubjects();
            showAlert('Timetable generated successfully', 'success');
        } else {
            showAlert(result.message || 'Failed to generate timetable', 'error');
        }
    } catch (error) {
        console.error('Error generating timetable:', error);
        showAlert('Error generating timetable', 'error');
    } finally {
        showLoading(false);
    }
}

// Display timetable grid
function displayTimetable() {
    const container = document.getElementById('timetableContainer');
    const grid = document.getElementById('timetableGrid');
    
    // Clear existing grid
    grid.innerHTML = '';
    
    // Create header row
    const headerRow = document.createElement('div');
    headerRow.className = 'timetable-header';
    headerRow.textContent = 'Date/Time';
    grid.appendChild(headerRow);
    
    // Add time slots headers
    const timeSlots = ['FN (9:00-12:00)', 'AN (2:00-5:00)'];
    timeSlots.forEach(slot => {
        const header = document.createElement('div');
        header.className = 'timetable-header';
        header.textContent = slot;
        grid.appendChild(header);
    });
    
    // Generate date rows
    const startDate = new Date(currentNotification.start_date);
    const endDate = new Date(currentNotification.end_date);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
        
        // Date cell
        const dateCell = document.createElement('div');
        dateCell.className = 'timetable-header';
        dateCell.textContent = displayDate;
        grid.appendChild(dateCell);
        
        // Time slot cells
        timeSlots.forEach((slot, index) => {
            const slotCell = document.createElement('div');
            slotCell.className = 'timetable-cell';
            slotCell.dataset.date = dateStr;
            slotCell.dataset.slot = index;
            
            // Find assigned subject for this slot
            const assignedSubject = timetableData.find(item => 
                item.exam_date === dateStr && item.time_slot === index
            );
            
            if (assignedSubject) {
                slotCell.innerHTML = createSubjectCard(assignedSubject);
            } else {
                slotCell.innerHTML = `<div class="timetable-slot" data-date="${dateStr}" data-slot="${index}">Drop subject here</div>`;
            }
            
            grid.appendChild(slotCell);
        });
    }
    
    container.style.display = 'block';
    initializeDragAndDrop();
}

// Create subject card HTML
function createSubjectCard(subject) {
    return `
        <div class="subject-card" draggable="true" data-subject-id="${subject.subject_id}">
            <strong>${subject.subject_name}</strong><br>
            <small>${subject.subject_code}</small><br>
            <small>🧑‍🎓 ${subject.student_count} students</small><br>
            <small>${subject.programme} - ${subject.semester}</small>
        </div>
    `;
}

// Display unassigned subjects
function displayUnassignedSubjects() {
    const container = document.getElementById('unassignedSubjects');
    container.innerHTML = '';
    
    unassignedSubjects.forEach(subject => {
        const subjectCard = document.createElement('div');
        subjectCard.className = 'subject-card';
        subjectCard.draggable = true;
        subjectCard.dataset.subjectId = subject.subject_id;
        subjectCard.innerHTML = `
            <strong>${subject.subject_name}</strong><br>
            <small>${subject.subject_code}</small><br>
            <small>🧑‍🎓 ${subject.student_count} students</small><br>
            <small>${subject.programme} - ${subject.semester} - ${subject.regulation}</small>
        `;
        container.appendChild(subjectCard);
    });
    
    statistics.assignedSlots = timetableData.length;
    updateStatisticsDisplay();
}

// Initialize drag and drop
function initializeDragAndDrop() {
    // Make subject cards draggable
    document.querySelectorAll('.subject-card').forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
    });
    
    // Make timetable slots droppable
    document.querySelectorAll('.timetable-slot').forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('drop', handleDrop);
        slot.addEventListener('dragleave', handleDragLeave);
    });
}

// Drag and drop handlers
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.dataTransfer.setData('subjectId', e.target.dataset.subjectId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    e.target.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.target.classList.remove('drag-over');
    
    const subjectId = e.dataTransfer.getData('subjectId');
    const date = e.target.dataset.date;
    const slot = e.target.dataset.slot;
    
    // Find subject data
    const subject = unassignedSubjects.find(s => s.subject_id == subjectId);
    if (subject) {
        // Add to timetable
        timetableData.push({
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
            programme: subject.programme,
            semester: subject.semester,
            regulation: subject.regulation,
            student_count: subject.student_count,
            exam_date: date,
            time_slot: slot
        });
        
        // Update UI
        e.target.innerHTML = createSubjectCard(subject);
        
        // Remove from unassigned
        const index = unassignedSubjects.findIndex(s => s.subject_id == subjectId);
        if (index > -1) {
            unassignedSubjects.splice(index, 1);
        }
        
        displayUnassignedSubjects();
        showAlert('Subject assigned successfully', 'success');
    }
    
    return false;
}

// Auto-assign subjects
function autoAssignSubjects() {
    showAlert('Auto-assigning subjects...', 'info');
    
    // Simple algorithm: assign subjects to available slots
    const availableSlots = [];
    const startDate = new Date(currentNotification.start_date);
    const endDate = new Date(currentNotification.end_date);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        for (let slot = 0; slot < 2; slot++) {
            // Check if slot is already occupied
            const occupied = timetableData.find(item => 
                item.exam_date === dateStr && item.time_slot === slot
            );
            
            if (!occupied) {
                availableSlots.push({ date: dateStr, slot });
            }
        }
    }
    
    // Assign subjects to available slots
    let assignedCount = 0;
    unassignedSubjects.slice(0, availableSlots.length).forEach((subject, index) => {
        const slot = availableSlots[index];
        timetableData.push({
            subject_id: subject.subject_id,
            subject_name: subject.subject_name,
            subject_code: subject.subject_code,
            programme: subject.programme,
            semester: subject.semester,
            regulation: subject.regulation,
            student_count: subject.student_count,
            exam_date: slot.date,
            time_slot: slot.slot
        });
        assignedCount++;
    });
    
    // Remove assigned subjects from unassigned list
    unassignedSubjects.splice(0, assignedCount);
    
    displayTimetable();
    displayUnassignedSubjects();
    showAlert(`Auto-assigned ${assignedCount} subjects`, 'success');
}

// Clear timetable
function clearTimetable() {
    if (confirm('Are you sure you want to clear the entire timetable?')) {
        timetableData = [];
        unassignedSubjects = []; // This would be reloaded from API
        displayTimetable();
        displayUnassignedSubjects();
        showAlert('Timetable cleared', 'info');
    }
}

// Check conflicts
function checkConflicts() {
    const conflicts = [];
    
    // Check for same subject assigned multiple times
    const subjectIds = timetableData.map(item => item.subject_id);
    const duplicateSubjects = subjectIds.filter((id, index) => subjectIds.indexOf(id) !== index);
    
    if (duplicateSubjects.length > 0) {
        conflicts.push(`${duplicateSubjects.length} subjects are assigned multiple times`);
    }
    
    // Check for room capacity conflicts (would need room data)
    // Check for invigilator conflicts (would need invigilator data)
    
    if (conflicts.length > 0) {
        showAlert(`Conflicts found:\n${conflicts.join('\n')}`, 'warning');
    } else {
        showAlert('No conflicts found', 'success');
    }
}

// Save timetable
async function saveTimetable() {
    try {
        const response = await fetch(`/api/internal-exam/timetable/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                notification_id: currentNotification.notification_id,
                timetable: timetableData
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Timetable saved successfully', 'success');
        } else {
            showAlert(result.message || 'Failed to save timetable', 'error');
        }
    } catch (error) {
        console.error('Error saving timetable:', error);
        showAlert('Error saving timetable', 'error');
    }
}

// Export timetable
function exportTimetable() {
    showAlert('Export functionality coming soon', 'info');
}

// Generate hall tickets
function generateHallTickets() {
    window.location.href = `generate-hall-tickets.html?notification_id=${currentNotification.notification_id}`;
}

// Publish notification
async function publishNotification() {
    try {
        const response = await fetch(`/api/internal-exam/notifications/${currentNotification.notification_id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'Published',
                changed_by: 'Admin'
            })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert('Notification published successfully', 'success');
        } else {
            showAlert(result.message || 'Failed to publish notification', 'error');
        }
    } catch (error) {
        console.error('Error publishing notification:', error);
        showAlert('Error publishing notification', 'error');
    }
}

// View notifications
function viewNotifications() {
    window.location.href = 'view-notifications.html';
}

// Filter timetable
function filterTimetable() {
    // Implementation for filtering based on selected filters
    showAlert('Filter functionality coming soon', 'info');
}

// Show/hide loading spinner
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const container = document.getElementById('timetableContainer');
    
    if (show) {
        spinner.style.display = 'block';
        container.style.display = 'none';
    } else {
        spinner.style.display = 'none';
        if (timetableData.length > 0) {
            container.style.display = 'block';
        }
    }
}

// Show alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
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
