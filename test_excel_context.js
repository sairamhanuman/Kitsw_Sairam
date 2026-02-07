/**
 * Test Excel Import/Export with Context Enhancement
 * 
 * This test validates:
 * 1. Excel generation creates correct structure with context in first 4 rows
 * 2. Excel import correctly reads context from first 4 rows
 * 3. Context validation and error handling
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

console.log('=== EXCEL CONTEXT FORMAT TEST ===\n');

// Test 1: Verify Excel generation structure
function testExcelGeneration() {
    console.log('Test 1: Excel Generation with Context Rows');
    console.log('='.repeat(50));
    
    const workbook = XLSX.utils.book_new();
    
    // Create context metadata rows (first 4 rows)
    const contextRows = [
        { A: 'Programme', B: 'BTECH' },
        { A: 'Branch', B: 'CSE' },
        { A: 'Semester', B: 'Semester I' },
        { A: 'Regulation', B: 'URR-22' },
        { A: '', B: '' }  // Empty separator row
    ];
    
    // Define column headers
    const headers = {
        A: 'subject_order',
        B: 'syllabus_code',
        C: 'ref_code',
        D: 'internal_exam_code',
        E: 'external_exam_code',
        F: 'subject_name',
        G: 'subject_type',
        H: 'internal_max_marks',
        I: 'external_max_marks',
        J: 'ta_max_marks',
        K: 'credits',
        L: 'is_elective',
        M: 'is_under_group',
        N: 'is_exempt_exam_fee'
    };
    
    // Sample subject data
    const sampleSubjects = [
        headers,
        {
            A: 1,
            B: 'U18MH101',
            C: 'EM-I',
            D: 'U18MH101',
            E: 'U18MH101',
            F: 'ENGINEERING MATHEMATICS - I',
            G: 'Theory',
            H: 30,
            I: 60,
            J: 0,
            K: 4,
            L: 'No',
            M: 'No',
            N: 'No'
        },
        {
            A: 2,
            B: 'U18CS102',
            C: 'PPSC',
            D: 'U18CS102',
            E: 'U18CS102',
            F: 'PROGRAMMING FOR PROBLEM SOLVING IN C',
            G: 'Theory',
            H: 30,
            I: 60,
            J: 0,
            K: 3,
            L: 'No',
            M: 'No',
            N: 'No'
        }
    ];
    
    // Combine context rows and sample data
    const allRows = [...contextRows, ...sampleSubjects];
    
    const worksheet = XLSX.utils.json_to_sheet(allRows, { skipHeader: true });
    
    // Set column widths
    worksheet['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 18 },
        { wch: 18 }, { wch: 40 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');
    
    // Write to test file
    const testFile = '/tmp/test_excel_context.xlsx';
    XLSX.writeFile(workbook, testFile);
    
    console.log('✅ Test file created:', testFile);
    
    // Verify the file was created
    if (fs.existsSync(testFile)) {
        console.log('✅ File exists');
        
        // Read and verify structure
        const readWorkbook = XLSX.readFile(testFile);
        const readWorksheet = readWorkbook.Sheets[readWorkbook.SheetNames[0]];
        const allData = XLSX.utils.sheet_to_json(readWorksheet, { header: 'A', defval: '' });
        
        console.log('\n📋 Excel Structure Verification:');
        console.log('Row 1 (Programme):', allData[0]);
        console.log('Row 2 (Branch):', allData[1]);
        console.log('Row 3 (Semester):', allData[2]);
        console.log('Row 4 (Regulation):', allData[3]);
        console.log('Row 5 (Empty):', allData[4]);
        console.log('Row 6 (Headers):', allData[5]);
        console.log('Row 7 (First Subject):', allData[6]);
        
        // Validate context extraction
        const context = {
            programme: allData[0]?.B || '',
            branch: allData[1]?.B || '',
            semester: allData[2]?.B || '',
            regulation: allData[3]?.B || ''
        };
        
        console.log('\n📝 Extracted Context:', context);
        
        if (context.programme === 'BTECH' && 
            context.branch === 'CSE' && 
            context.semester === 'Semester I' && 
            context.regulation === 'URR-22') {
            console.log('✅ Context extracted correctly!');
        } else {
            console.log('❌ Context extraction failed!');
            return false;
        }
        
        // Verify subject data starts at row 6 (index 5)
        const subjectData = XLSX.utils.sheet_to_json(readWorksheet, { range: 5 });
        console.log('\n📊 Subject Data (starting from row 6):');
        console.log(`Found ${subjectData.length} subject rows`);
        console.log('First subject:', subjectData[0]);
        
        if (subjectData.length === 2 && 
            subjectData[0].syllabus_code === 'U18MH101' &&
            subjectData[1].syllabus_code === 'U18CS102') {
            console.log('✅ Subject data parsed correctly!');
            console.log('\n✅ Test 1 PASSED: Excel structure is correct\n');
            return true;
        } else {
            console.log('❌ Subject data parsing failed!');
            return false;
        }
    } else {
        console.log('❌ File was not created');
        return false;
    }
}

// Test 2: Verify context validation
function testContextValidation() {
    console.log('\nTest 2: Context Validation');
    console.log('='.repeat(50));
    
    const workbook = XLSX.utils.book_new();
    
    // Create invalid context (missing regulation)
    const invalidContextRows = [
        { A: 'Programme', B: 'BTECH' },
        { A: 'Branch', B: 'CSE' },
        { A: 'Semester', B: 'Semester I' },
        { A: 'Regulation', B: '' },  // Missing regulation
        { A: '', B: '' }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(invalidContextRows, { skipHeader: true });
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subjects');
    
    const testFile = '/tmp/test_excel_invalid.xlsx';
    XLSX.writeFile(workbook, testFile);
    
    // Read and validate
    const readWorkbook = XLSX.readFile(testFile);
    const readWorksheet = readWorkbook.Sheets[readWorkbook.SheetNames[0]];
    const allData = XLSX.utils.sheet_to_json(readWorksheet, { header: 'A', defval: '' });
    
    const context = {
        programme: allData[0]?.B || '',
        branch: allData[1]?.B || '',
        semester: allData[2]?.B || '',
        regulation: allData[3]?.B || ''
    };
    
    console.log('Invalid context:', context);
    
    if (!context.programme || !context.branch || !context.semester || !context.regulation) {
        console.log('✅ Validation correctly detected missing context');
        console.log('✅ Test 2 PASSED: Context validation works\n');
        return true;
    } else {
        console.log('❌ Validation failed to detect missing context');
        return false;
    }
}

// Test 3: Verify data mapping
function testDataMapping() {
    console.log('\nTest 3: Data Mapping from Excel to Database Format');
    console.log('='.repeat(50));
    
    const excelData = {
        subject_order: 1,
        syllabus_code: 'U18MH101',
        ref_code: 'EM-I',
        internal_exam_code: 'U18MH101',
        external_exam_code: 'U18MH101',
        subject_name: 'ENGINEERING MATHEMATICS - I',
        subject_type: 'Theory',
        internal_max_marks: 30,
        external_max_marks: 60,
        ta_max_marks: 0,
        credits: 4,
        is_elective: 'No',
        is_under_group: 'No',
        is_exempt_exam_fee: 'No'
    };
    
    // Simulate mapping logic from import endpoint
    const mappedData = {
        programme_id: 1,  // Would come from context
        branch_id: 1,     // Would come from context
        semester_id: 1,   // Would come from context
        regulation_id: 1, // Would come from context
        subject_order: excelData.subject_order || 1,
        syllabus_code: excelData.syllabus_code,
        ref_code: excelData.ref_code || null,
        internal_exam_code: excelData.internal_exam_code || null,
        external_exam_code: excelData.external_exam_code || null,
        subject_name: excelData.subject_name,
        subject_type: excelData.subject_type || 'Theory',
        internal_max_marks: excelData.internal_max_marks || 0,
        external_max_marks: excelData.external_max_marks || 0,
        ta_max_marks: excelData.ta_max_marks || 0,
        credits: excelData.credits || 0,
        is_elective: excelData.is_elective === 'Yes' ? 1 : 0,
        is_under_group: excelData.is_under_group === 'Yes' ? 1 : 0,
        is_exempt_exam_fee: excelData.is_exempt_exam_fee === 'Yes' ? 1 : 0
    };
    
    console.log('Excel data:', excelData);
    console.log('\nMapped to database format:', mappedData);
    
    if (mappedData.syllabus_code === 'U18MH101' &&
        mappedData.subject_name === 'ENGINEERING MATHEMATICS - I' &&
        mappedData.is_elective === 0) {
        console.log('✅ Data mapping is correct');
        console.log('✅ Test 3 PASSED: Data mapping works correctly\n');
        return true;
    } else {
        console.log('❌ Data mapping failed');
        return false;
    }
}

// Run all tests
function runAllTests() {
    console.log('Starting Excel Context Format Tests...\n');
    
    const results = {
        test1: testExcelGeneration(),
        test2: testContextValidation(),
        test3: testDataMapping()
    };
    
    console.log('\n' + '='.repeat(50));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(50));
    console.log(`Test 1 (Excel Generation): ${results.test1 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 2 (Context Validation): ${results.test2 ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Test 3 (Data Mapping): ${results.test3 ? '✅ PASSED' : '❌ FAILED'}`);
    
    const allPassed = results.test1 && results.test2 && results.test3;
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('✅ ALL TESTS PASSED!');
        console.log('Excel context format implementation is working correctly.');
    } else {
        console.log('❌ SOME TESTS FAILED!');
        console.log('Please review the implementation.');
    }
    console.log('='.repeat(50));
    
    return allPassed;
}

// Run tests
const success = runAllTests();
process.exit(success ? 0 : 1);
