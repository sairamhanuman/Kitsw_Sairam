// Content templates for each menu item
const contentTemplates = {
    'programme': {
        title: 'Programme Management',
        content: 'Manage engineering programmes such as B.Tech, M.Tech, Ph.D., etc. Add, edit, or remove programme details.'
    },
    'branch': {
        title: 'Branch Management',
        content: 'Manage different branches like Computer Science, Electrical, Mechanical, Civil, etc. Configure branch-specific settings.'
    },
    'batch': {
        title: 'Batch Management',
        content: 'Create and manage student batches by year of admission. Track batch progress and configure batch-specific rules.'
    },
    'semesters': {
        title: 'Semester Configuration',
        content: 'Configure semester details including duration, start dates, end dates, and examination schedules for each semester.'
    },
    'regulation': {
        title: 'Regulation Management',
        content: 'Manage academic regulations including syllabus versions, credit requirements, and grading policies for different batches.'
    },
    'section': {
        title: 'Section Management',
        content: 'Create and manage sections within each batch. Assign students to sections and configure section capacities.'
    },
    'exam-sessions': {
        title: 'Exam Sessions',
        content: 'Configure examination sessions including regular exams, supplementary exams, and their respective schedules.'
    },
    'student-management': {
        title: 'Student Management',
        content: 'Add, edit, and manage student records. Import student data, assign to programmes, branches, batches, and sections.'
    },
    'staff-master': {
        title: 'Staff Master',
        content: 'Manage faculty and staff information including personal details, qualifications, department assignments, and roles.'
    },
    'course-import': {
        title: 'Course Import/Entry Verification',
        content: 'Import course data from external sources or enter manually. Verify and validate course information before finalizing.'
    },
    'course-mapping': {
        title: 'Course Mapping vs Faculty',
        content: 'Map courses to faculty members. Assign instructors to courses for each semester and track teaching assignments.'
    },
    'exam-setup': {
        title: 'Exam Setup',
        content: 'Configure examination parameters including exam types, duration, marks distribution, and evaluation criteria.'
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeContentSwitching();
});

// Initialize navigation expand/collapse functionality
function initializeNavigation() {
    // Handle main section headers (PRE-EXAMINATIONS, POST-EXAMINATIONS)
    const menuHeaders = document.querySelectorAll('.menu-header');
    menuHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sectionId = this.getAttribute('data-section');
            const submenu = document.getElementById(sectionId);
            
            // Toggle active class on header
            this.classList.toggle('active');
            
            // Toggle active class on submenu
            submenu.classList.toggle('active');
        });
    });

    // Handle submenu headers (Masters, Course Master)
    const submenuHeaders = document.querySelectorAll('.submenu-header');
    submenuHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.stopPropagation();
            const submenuId = this.getAttribute('data-submenu');
            const submenuItems = document.getElementById(submenuId);
            
            // Toggle active class on header
            this.classList.toggle('active');
            
            // Toggle active class on submenu items
            submenuItems.classList.toggle('active');
        });
    });
}

// Initialize content switching functionality
function initializeContentSwitching() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remove active class from all menu items
            menuItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get content key and display content
            const contentKey = this.getAttribute('data-content');
            displayContent(contentKey);
        });
    });
}

// Display content based on menu selection
function displayContent(contentKey) {
    const contentDisplay = document.getElementById('content-display');
    const template = contentTemplates[contentKey];
    
    if (template) {
        contentDisplay.innerHTML = `
            <div class="content-page">
                <h2>${template.title}</h2>
                <p>${template.content}</p>
                <div class="info-box" style="margin-top: 30px;">
                    <h3>Features Coming Soon:</h3>
                    <ul>
                        <li>Data entry forms</li>
                        <li>List and table views</li>
                        <li>Search and filter options</li>
                        <li>Import/Export functionality</li>
                        <li>Reports and analytics</li>
                    </ul>
                </div>
            </div>
        `;
    } else {
        contentDisplay.innerHTML = `
            <div class="content-page">
                <h2>Content Not Available</h2>
                <p>The selected feature is under development.</p>
            </div>
        `;
    }
}

// Optional: Auto-expand first section on load
window.addEventListener('load', function() {
    const firstMenuHeader = document.querySelector('.menu-header');
    if (firstMenuHeader) {
        firstMenuHeader.click();
    }
});
