/**
 * Enhanced Exam Scheduling Frontend
 * Professional exam scheduling with auto-generation and drag-and-drop
 */

// Global variables
let enhancedSchedules = [];
let timeSlots = [];
let availableRooms = [];
let currentTimetableId = null;
let draggedSchedule = null;

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeEnhancedScheduling();
    loadTimeSlots();
    loadAvailableRooms();
});

async function initializeEnhancedScheduling() {
    console.log('🚀 Initializing enhanced exam scheduling...');
    
    // Setup event listeners for auto-generation
    const autoGenerateBtn = document.getElementById('autoGenerateBtn');
    if (autoGenerateBtn) {
        autoGenerateBtn.addEventListener('click', handleAutoGeneration);
    }
    
    // Setup event listeners for conflict detection
    const detectConflictsBtn = document.getElementById('detectConflictsBtn');
    if (detectConflictsBtn) {
        detectConflictsBtn.addEventListener('click', handleConflictDetection);
    }
    
    // Initialize drag and drop
    initializeDragAndDrop();
}

// =====================================================
// TIME SLOTS MANAGEMENT
// =====================================================

async function loadTimeSlots() {
    try {
        const response = await fetch('/api/exam-schedule-enhanced/time-slots');
        const result = await response.json();
        
        if (result.status === 'success') {
            timeSlots = result.data;
            console.log(`⏰ Loaded ${timeSlots.length} time slots`);
            populateTimeSlots();
        }
    } catch (error) {
        console.error('Error loading time slots:', error);
    }
}

function populateTimeSlots() {
    const container = document.getElementById('timeSlotsContainer');
    if (!container) return;
    
    container.innerHTML = timeSlots.map(slot => `
        <div class="time-slot" data-slot-id="${slot.slot_id}">
            <div class="slot-header">${slot.slot_name}</div>
            <div class="slot-time">${slot.start_time} - ${slot.end_time}</div>
            <div class="slot-type">${slot.slot_type}</div>
        </div>
    `).join('');
}

// =====================================================
// AUTO-GENERATION
// =====================================================

async function handleAutoGeneration() {
    console.log('🤖 Starting auto-generation...');
    
    // Get generation parameters
    const params = {
        timetable_id: currentTimetableId,
        exam_session_id: document.getElementById('genExamSession')?.value,
        branch_id: document.getElementById('genBranch')?.value,
        semester_id: document.getElementById('genSemester')?.value,
        academic_year: document.getElementById('genAcademicYear')?.value,
        generation_mode: document.getElementById('genMode')?.value || 'Semi-Auto',
        time_gap_minutes: parseInt(document.getElementById('genTimeGap')?.value) || 30,
        max_exams_per_day: parseInt(document.getElementById('genMaxPerDay')?.value) || 4,
        consider_student_strength: document.getElementById('genStudentStrength')?.checked,
        avoid_consecutive_exams: document.getElementById('genAvoidConsecutive')?.checked,
        auto_assign_rooms: document.getElementById('genAutoRooms')?.checked,
        auto_assign_invigilators: document.getElementById('genAutoInvigilators')?.checked
    };
    
    // Validate
    if (!params.timetable_id || !params.branch_id || !params.semester_id || !params.academic_year) {
        showAlert('Please select timetable, branch, semester, and academic year', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/exam-schedule-enhanced/auto-generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showAlert(`Successfully generated ${result.data.generated_schedules} exam schedules!`, 'success');
            loadEnhancedSchedules(currentTimetableId);
            renderCalendar();
        } else {
            showAlert(result.message || 'Auto-generation failed', 'error');
        }
        
    } catch (error) {
        console.error('Auto-generation error:', error);
        showAlert('Failed to auto-generate schedule', 'error');
    } finally {
        hideLoading();
    }
}

// =====================================================
// CONFLICT DETECTION
// =====================================================

async function handleConflictDetection() {
    if (!currentTimetableId) {
        showAlert('Please select a timetable first', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/exam-schedule-enhanced/detect-conflicts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ timetable_id: currentTimetableId })
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            displayConflicts(result.data);
            showAlert(`Detected ${result.data.total_conflicts} conflicts`, 'warning');
        } else {
            showAlert(result.message || 'Conflict detection failed', 'error');
        }
        
    } catch (error) {
        console.error('Conflict detection error:', error);
        showAlert('Failed to detect conflicts', 'error');
    } finally {
        hideLoading();
    }
}

function displayConflicts(conflictData) {
    const container = document.getElementById('conflictsContainer');
    if (!container) return;
    
    if (conflictData.total_conflicts === 0) {
        container.innerHTML = `
            <div class="no-conflicts">
                <h4>✅ No Conflicts Detected</h4>
                <p>All exam schedules are conflict-free!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="conflicts-summary">
            <h4>⚠️ Conflicts Found (${conflictData.total_conflicts})</h4>
            <div class="conflict-types">
                <div class="conflict-type">
                    <span class="count">${conflictData.room_conflicts}</span>
                    <span class="label">Room Conflicts</span>
                </div>
                <div class="conflict-type">
                    <span class="count">${conflictData.faculty_conflicts}</span>
                    <span class="label">Faculty Conflicts</span>
                </div>
                <div class="conflict-type">
                    <span class="count">${conflictData.student_conflicts}</span>
                    <span class="label">Student Conflicts</span>
                </div>
            </div>
        </div>
        <div class="conflicts-list">
            ${conflictData.conflicts.map(conflict => `
                <div class="conflict-item ${conflict.conflict_type.toLowerCase().replace(' ', '-')}">
                    <div class="conflict-header">
                        <span class="conflict-type">${conflict.conflict_type}</span>
                        <span class="conflict-date">${formatDate(conflict.exam_date)}</span>
                        <span class="priority ${conflict.priority.toLowerCase()}">${conflict.priority}</span>
                    </div>
                    <div class="conflict-description">${conflict.conflict_description}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// =====================================================
// ENHANCED SCHEDULE MANAGEMENT
// =====================================================

async function loadEnhancedSchedules(timetableId) {
    currentTimetableId = timetableId;
    
    try {
        const response = await fetch(`/api/exam-schedule-enhanced/enhanced/${timetableId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            enhancedSchedules = result.data;
            console.log(`📅 Loaded ${enhancedSchedules.length} enhanced schedules`);
            renderCalendar();
        }
    } catch (error) {
        console.error('Error loading enhanced schedules:', error);
    }
}

// =====================================================
// DRAG AND DROP FUNCTIONALITY
// =====================================================

function initializeDragAndDrop() {
    console.log('🎯 Initializing drag-and-drop...');
    
    // Make all schedule items draggable
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragend', handleDragEnd);
}

function handleDragStart(event) {
    const scheduleElement = event.target.closest('.schedule-item');
    if (!scheduleElement) return;
    
    const scheduleId = scheduleElement.dataset.scheduleId;
    draggedSchedule = enhancedSchedules.find(s => s.schedule_id == scheduleId);
    
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    
    console.log('🎯 Started dragging:', draggedSchedule.subject_name);
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const dropZone = event.target.closest('.time-slot, .date-cell');
    if (dropZone) {
        dropZone.classList.add('drag-over');
    }
}

function handleDrop(event) {
    event.preventDefault();
    
    const dropZone = event.target.closest('.time-slot, .date-cell');
    if (!dropZone || !draggedSchedule) return;
    
    // Extract new date/time from drop zone
    const newDate = dropZone.dataset.date;
    const newTimeSlot = dropZone.dataset.timeSlot;
    
    // Update schedule
    const updatedSchedule = {
        ...draggedSchedule,
        exam_date: newDate,
        start_time: newTimeSlot ? timeSlots.find(s => s.slot_id == newTimeSlot)?.start_time : draggedSchedule.start_time
    };
    
    // Update on backend
    updateScheduleOnBackend(draggedSchedule.schedule_id, updatedSchedule);
    
    // Clean up
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    draggedSchedule = null;
}

function handleDragEnd(event) {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

async function updateScheduleOnBackend(scheduleId, updates) {
    try {
        const response = await fetch(`/api/exam-schedule-enhanced/enhanced/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            console.log('✅ Schedule updated via drag-and-drop');
            loadEnhancedSchedules(currentTimetableId); // Refresh
        } else {
            showAlert('Failed to update schedule', 'error');
        }
    } catch (error) {
        console.error('Drag-and-drop update error:', error);
    }
}

// =====================================================
// CALENDAR RENDERING
// =====================================================

function renderCalendar() {
    const container = document.getElementById('enhancedCalendarContainer');
    if (!container) return;
    
    // Group schedules by date
    const schedulesByDate = {};
    enhancedSchedules.forEach(schedule => {
        const date = schedule.exam_date;
        if (!schedulesByDate[date]) {
            schedulesByDate[date] = [];
        }
        schedulesByDate[date].push(schedule);
    });
    
    // Generate calendar HTML
    const dates = Object.keys(schedulesByDate).sort();
    const calendarHTML = dates.map(date => `
        <div class="calendar-day" data-date="${date}">
            <div class="day-header">${formatDate(date)}</div>
            <div class="day-schedules">
                ${schedulesByDate[date].map(schedule => `
                    <div class="schedule-item ${schedule.conflict_status !== 'No Conflict' ? 'has-conflict' : ''}" 
                         data-schedule-id="${schedule.schedule_id}"
                         draggable="true">
                        <div class="schedule-time">${schedule.start_time}</div>
                        <div class="schedule-subject">${schedule.subject_name}</div>
                        <div class="schedule-room">${schedule.room_name}</div>
                        <div class="schedule-invigilator">${schedule.chief_invigilator_name}</div>
                        ${schedule.conflict_status !== 'No Conflict' ? '<div class="conflict-indicator">⚠️</div>' : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    container.innerHTML = calendarHTML;
    
    // Add drag-and-drop listeners to schedule items
    container.querySelectorAll('.schedule-item[draggable="true"]').forEach(item => {
        item.addEventListener('dragstart', handleDragStart);
    });
}

// =====================================================
// ROOMS MANAGEMENT
// =====================================================

async function loadAvailableRooms() {
    try {
        const response = await fetch('/api/rooms');
        const result = await response.json();
        
        if (result.status === 'success') {
            availableRooms = result.data;
            console.log(`🏠 Loaded ${availableRooms.length} rooms`);
            populateRoomOptions();
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
}

function populateRoomOptions() {
    const select = document.getElementById('genRoomPreference');
    if (!select) return;
    
    select.innerHTML = availableRooms.map(room => `
        <option value="${room.room_id}">${room.room_name} (Capacity: ${room.capacity})</option>
    `).join('');
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function showAlert(message, type = 'info') {
    // Implementation depends on your existing alert system
    console.log(`${type.toUpperCase()}: ${message}`);
    // You can integrate with your existing showAlert function
}

function showLoading() {
    // Implementation depends on your existing loading system
    console.log('⏳ Loading...');
}

function hideLoading() {
    // Implementation depends on your existing loading system
    console.log('✅ Loading complete');
}

// Export for use in other files
window.EnhancedScheduling = {
    loadEnhancedSchedules,
    handleAutoGeneration,
    handleConflictDetection,
    renderCalendar,
    initializeDragAndDrop
};
