// Test script to verify form fix
// Run this in browser console after the page loads

function testFormFix() {
    console.log('🔧 Testing form fix...');
    
    // Check if form has name attributes
    const form = document.getElementById('examScheduleForm');
    if (!form) {
        console.error('❌ Form not found!');
        return;
    }
    
    // Check all required fields have name attributes
    const requiredFields = [
        { id: 'examSession', name: 'exam_session_id' },
        { id: 'examType', name: 'exam_type_id' },
        { id: 'examName', name: 'exam_name' },
        { id: 'academicYear', name: 'academic_year' },
        { id: 'programmeSelect', name: 'programme_id' },
        { id: 'branchSelect', name: 'branch_id' },
        { id: 'semesterSelect', name: 'semester_id' },
        { id: 'startDate', name: 'start_date' },
        { id: 'endDate', name: 'end_date' }
    ];
    
    console.log('📋 Checking field name attributes...');
    let allGood = true;
    
    requiredFields.forEach(field => {
        const element = document.getElementById(field.id);
        if (element) {
            if (element.name === field.name) {
                console.log(`  ✅ ${field.id}: name="${element.name}"`);
            } else {
                console.log(`  ❌ ${field.id}: name="${element.name}" (expected "${field.name}")`);
                allGood = false;
            }
        } else {
            console.log(`  ❌ ${field.id}: Field not found!`);
            allGood = false;
        }
    });
    
    if (allGood) {
        console.log('✅ All form fields have correct name attributes!');
        
        // Test FormData capture
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log('📤 FormData test result:', data);
        
        if (Object.keys(data).length > 0) {
            console.log('✅ FormData is working correctly!');
        } else {
            console.log('❌ FormData is still empty - fields need values');
        }
    } else {
        console.log('❌ Some fields are missing name attributes');
    }
}

// Auto-run test
testFormFix();

// Add manual test function
window.testFormFix = testFormFix;
console.log('🔧 Form fix test loaded. Run testFormFix() to verify.');
