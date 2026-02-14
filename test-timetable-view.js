// Test script to verify timetable view fix
// Run this in browser console after the page loads

function testTimetableView() {
    console.log('🔧 Testing timetable view fix...');
    
    // Test the API endpoint directly
    const testIds = [1, 2]; // Test with your created timetable IDs
    
    testIds.forEach(async (id) => {
        try {
            console.log(`🔍 Testing GET /api/exam-timetable/${id}`);
            
            const response = await fetch(`/api/exam-timetable/${id}`);
            const data = await response.json();
            
            console.log(`📥 Response for ID ${id}:`, {
                status: response.status,
                data: data
            });
            
            if (data.status === 'success') {
                console.log(`✅ Timetable ${id} loaded successfully!`);
                console.log(`   - Name: ${data.data.exam_name}`);
                console.log(`   - Programme: ${data.data.programme_name}`);
                console.log(`   - Branch: ${data.data.branch_name}`);
                console.log(`   - Status: ${data.data.status}`);
                console.log(`   - Schedules: ${data.schedules.length} found`);
            } else {
                console.log(`❌ Timetable ${id} failed: ${data.message}`);
            }
        } catch (error) {
            console.error(`❌ Error testing timetable ${id}:`, error);
        }
    });
}

// Test the view button functionality
function testViewButton() {
    console.log('🔧 Testing view button functionality...');
    
    // Find view buttons in the timetable table
    const viewButtons = document.querySelectorAll('button[onclick*="viewTimetable"]');
    
    if (viewButtons.length === 0) {
        console.log('❌ No view buttons found. Make sure timetables are loaded first.');
        return;
    }
    
    console.log(`✅ Found ${viewButtons.length} view buttons`);
    
    // Test the first view button
    const firstButton = viewButtons[0];
    const onclickAttr = firstButton.getAttribute('onclick');
    const timetableId = onclickAttr.match(/viewTimetable\((\d+)\)/);
    
    if (timetableId) {
        console.log(`🔍 Testing view button for timetable ID: ${timetableId[1]}`);
        
        // Simulate clicking the view button
        viewTimetable(parseInt(timetableId[1]));
    } else {
        console.log('❌ Could not extract timetable ID from view button');
    }
}

// Auto-run tests
testTimetableView();
setTimeout(testViewButton, 1000);

// Add manual test functions
window.testTimetableView = testTimetableView;
window.testViewButton = testViewButton;

console.log('🔧 Timetable view test loaded. Run testTimetableView() or testViewButton() to test.');
