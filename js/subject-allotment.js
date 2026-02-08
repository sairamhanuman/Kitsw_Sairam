document.addEventListener("DOMContentLoaded", function () {
    loadProgrammes();
    loadBatches();
    loadStaff();
    loadAllotments();
});

/* ================================
   LOAD DROPDOWNS
================================ */

// PROGRAMME
async function loadProgrammes() {
    const res = await fetch("/api/programmes");
    const data = await res.json();

    const dropdown = document.getElementById("programmeId");
    dropdown.innerHTML = `<option value="">Select Programme</option>`;

    data.data.forEach(p => {
        dropdown.innerHTML += `<option value="${p.programme_id}">${p.programme_code}</option>`;
    });

    dropdown.addEventListener("change", loadBranches);
}

// BRANCH
async function loadBranches() {
    const programmeId = document.getElementById("programmeId").value;
    const res = await fetch(`/api/branches?programme_id=${programmeId}`);
    const data = await res.json();

    const dropdown = document.getElementById("branchId");
    dropdown.innerHTML = `<option value="">Select Branch</option>`;

    data.data.forEach(b => {
        dropdown.innerHTML += `<option value="${b.branch_id}">${b.branch_code}</option>`;
    });

    dropdown.addEventListener("change", loadSemesters);
}

// SEMESTER
async function loadSemesters() {
    const branchId = document.getElementById("branchId").value;
    const res = await fetch(`/api/semesters?branch_id=${branchId}`);
    const data = await res.json();

    const dropdown = document.getElementById("semesterId");
    dropdown.innerHTML = `<option value="">Select Semester</option>`;

    data.data.forEach(s => {
        dropdown.innerHTML += `<option value="${s.semester_id}">${s.semester_name}</option>`;
    });

    dropdown.addEventListener("change", loadRegulations);
}

// REGULATION
async function loadRegulations() {
    const res = await fetch(`/api/regulations`);
    const data = await res.json();

    const dropdown = document.getElementById("regulationId");
    dropdown.innerHTML = `<option value="">Select Regulation</option>`;

    data.forEach(r => {
        dropdown.innerHTML += `
            <option value="${r.regulation_id}">
                ${r.regulation_name}
            </option>
        `;
    });

    dropdown.addEventListener("change", loadSubjects);
}

// SUBJECT
async function loadSubjects() {

    const programmeId = document.getElementById("programmeId").value;
    const branchId = document.getElementById("branchId").value;
    const semesterId = document.getElementById("semesterId").value;
    const regulationId = document.getElementById("regulationId").value;

    const res = await fetch(
        `/api/subjects?programme_id=${programmeId}&branch_id=${branchId}&semester_id=${semesterId}&regulation_id=${regulationId}`
    );

    const data = await res.json();

    const dropdown = document.getElementById("subjectId");
    dropdown.innerHTML = `<option value="">Select Subject</option>`;

    if (data.data) {
        data.data.forEach(s => {
            dropdown.innerHTML += `
                <option value="${s.subject_id}">
                    ${s.syllabus_code} - ${s.subject_name}
                </option>
            `;
        });
    }
}

/* ================================
   BATCH & SECTION
================================ */

async function loadBatches() {
    const res = await fetch("/api/batches");
    const data = await res.json();

    const dropdown = document.getElementById("batchId");
    dropdown.innerHTML = `<option value="">Select Batch</option>`;

    data.data.forEach(b => {
        dropdown.innerHTML += `<option value="${b.batch_id}">${b.batch_name}</option>`;
    });

    dropdown.addEventListener("change", loadSections);
}

async function loadSections() {
    const batchId = document.getElementById("batchId").value;
    const res = await fetch(`/api/sections?batch_id=${batchId}`);
    const data = await res.json();

    const dropdown = document.getElementById("sectionId");
    dropdown.innerHTML = `<option value="">Select Section</option>`;

    data.data.forEach(s => {
        dropdown.innerHTML += `<option value="${s.section_id}">${s.section_name}</option>`;
    });
}

/* ================================
   STAFF
================================ */

async function loadStaff() {

    const res = await fetch("/api/staff");
    const result = await res.json();

    const dropdown = document.getElementById("staffId");
    dropdown.innerHTML = `<option value="">Select Faculty</option>`;

    if (!result.data || !result.data.staff || result.data.staff.length === 0) {
        console.warn("No staff found");
        return;
    }

    result.data.staff.forEach(st => {
        dropdown.innerHTML += `
            <option value="${st.staff_id}">
                ${st.branch_code} - ${st.employee_id} - ${st.full_name}
            </option>
        `;
    });
}

/* ================================
   SAVE
================================ */

async function saveAllotment() {

    if (!programmeId.value ||
        !branchId.value ||
        !semesterId.value ||
        !regulationId.value ||
        !subjectId.value ||
        !batchId.value ||
        !sectionId.value ||
        !staffId.value) {

        alert("Please select all fields");
        return;
    }

    const body = {
        programme_id: parseInt(programmeId.value),
        branch_id: parseInt(branchId.value),
        semester_id: parseInt(semesterId.value),
        regulation_id: parseInt(regulationId.value),
        subject_id: parseInt(subjectId.value),
        batch_id: parseInt(batchId.value),
        section_id: parseInt(sectionId.value),
        staff_id: parseInt(staffId.value)
    };

    const res = await fetch("/api/subject-allotments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    alert(data.message);

    loadAllotments();
}

/* ================================
   LOAD TABLE
================================ */

async function loadAllotments() {

    const res = await fetch("/api/subject-allotments");
    const data = await res.json();

    let html = `
        <table class="table">
            <tr>
                <th>Syllabus</th>
                <th>Subject</th>
                <th>Batch</th>
                <th>Section</th>
                <th>Faculty</th>
                <th>Action</th>
            </tr>
    `;

    data.data.forEach(row => {
        html += `
            <tr>
                <td>${row.syllabus_code}</td>
                <td>${row.subject_name}</td>
                <td>${row.batch_name}</td>
                <td>${row.section_name}</td>
                <td>${row.faculty_name}</td>
                <td>
                    <button onclick="deleteAllotment(${row.allotment_id})" class="btn btn-danger">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</table>`;

    document.getElementById("tableContainer").innerHTML = html;
}

/* ================================
   DELETE
================================ */

async function deleteAllotment(id) {

    if (!confirm("Are you sure?")) return;

    await fetch(`/api/subject-allotments/${id}`, {
        method: "DELETE"
    });

    loadAllotments();
}
