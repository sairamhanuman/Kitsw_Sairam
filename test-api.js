// Test API endpoints to debug issues
const fetch = require('node-fetch');

async function testAPI() {
    const baseUrl = 'https://kitswsairam-production.up.railway.app';
    
    console.log('Testing API endpoints...');
    
    // Test 1: Exam timetables
    try {
        const response = await fetch(`${baseUrl}/api/exam-timetable`);
        const data = await response.json();
        console.log('✅ Exam timetables API:', response.status, data.status);
    } catch (error) {
        console.log('❌ Exam timetables API Error:', error.message);
    }
    
    // Test 2: Exam sessions
    try {
        const response = await fetch(`${baseUrl}/api/exam-sessions`);
        const data = await response.json();
        console.log('✅ Exam sessions API:', response.status, data.status);
        console.log('Data format:', typeof data, Array.isArray(data.data));
    } catch (error) {
        console.log('❌ Exam sessions API Error:', error.message);
    }
    
    // Test 3: Programmes
    try {
        const response = await fetch(`${baseUrl}/api/programmes`);
        const data = await response.json();
        console.log('✅ Programmes API:', response.status, data.status);
    } catch (error) {
        console.log('❌ Programmes API Error:', error.message);
    }
    
    // Test 4: MSE Exam Types
    try {
        const response = await fetch(`${baseUrl}/api/mse-exam-types`);
        const data = await response.json();
        console.log('✅ MSE Exam Types API:', response.status, data.status);
    } catch (error) {
        console.log('❌ MSE Exam Types API Error:', error.message);
    }
}

testAPI();
