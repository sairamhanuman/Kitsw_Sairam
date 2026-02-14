// Debug script to test form submission
// Run this in browser console on the exam timetable page

function debugFormSubmission() {
    console.log('🔍 Starting form debug...');
    
    // Check if form exists
    const form = document.getElementById('examScheduleForm');
    if (!form) {
        console.error('❌ Form not found!');
        return;
    }
    
    // Check all required fields
    const requiredFields = [
        'exam_session_id',
        'exam_name', 
        'exam_type_id',
        'programme_id',
        'branch_id',
        'semester_id',
        'academic_year',
        'startDate',
        'endDate'
    ];
    
    console.log('📋 Checking required fields...');
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            console.log(`  ✅ ${fieldId}: ${field.value} (type: ${field.type})`);
        } else {
            console.log(`  ❌ ${fieldId}: Field not found!`);
        }
    });
    
    // Test form submission with sample data
    const sampleData = {
        exam_session_id: '1',
        exam_name: 'Test Examination',
        exam_type_id: '1',
        programme_id: '1',
        branch_id: '1',
        semester_id: '1',
        academic_year: '2024-25',
        start_date: '2024-03-01',
        end_date: '2024-03-07',
        exam_duration_minutes: '120',
        max_students_per_room: '30',
        seating_pattern: 'branch_wise',
        requires_seating_arrangement: 'true',
        remarks: 'Test timetable creation'
    };
    
    console.log('📤 Sample data to submit:', sampleData);
    
    // Test API call
    fetch('/api/exam-timetable', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleData)
    })
    .then(response => response.json())
    .then(result => {
        console.log('📥 API Response:', result);
    })
    .catch(error => {
        console.error('❌ API Error:', error);
    });
}

// Auto-run debug
debugFormSubmission();

// Also add manual test function
window.testFormSubmission = debugFormSubmission;
console.log('🔧 Debug functions loaded. Run testFormSubmission() to test.');
