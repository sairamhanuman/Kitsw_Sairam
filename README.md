# Engineering College Application

A comprehensive web application for managing pre-examinations and post-examinations in an engineering college.

## 🎯 What to Do Next?

**New here?** Check out **[WHAT_TO_DO.md](WHAT_TO_DO.md)** for a complete guide on:
- 🚀 Getting started (5 minutes)
- 👨‍💻 Development roadmap
- 🎓 How to use the application
- 🔧 Available actions for your role
- 📋 Next steps and priorities

## Features

### PRE-EXAMINATIONS
- **Masters Management**
  - Programme Management
  - Branch Management
  - Batch Management
  - Semester Configuration
  - Regulation Management
  - Section Management
  - Exam Sessions
  - Student Management
  - Staff Master

- **Course Master**
  - Course Import/Entry Verification
  - Course Mapping vs Faculty

- **Exam Setup**
  - Examination configuration and setup

### POST-EXAMINATIONS
- Coming soon...

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Deployment**: Railway

## Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/sairamhanuman/Kitsw_Sairam.git
cd Kitsw_Sairam
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` file with your configuration:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=engineering_college
DB_PORT=3306
NODE_ENV=development
```

5. Create the database:
```sql
CREATE DATABASE engineering_college;
```

## Running Locally

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Testing & Verification

To verify your installation is working correctly, see our testing guides:

- **[VERIFICATION.md](VERIFICATION.md)** - Quick reference card (30 seconds - 5 minutes)
- **[TESTING.md](TESTING.md)** - Comprehensive testing guide (detailed)

**Quick Check (30 seconds):**
```bash
npm start
# Open browser to http://localhost:3000
# Look for green "Backend Connected" indicator ✅
```

**Command-Line Check:**
```bash
# Start server
npm start

# Test backend
curl http://localhost:3000/api/health
# Expected: {"status":"ok",...}
```

For detailed testing procedures, troubleshooting, and automated testing scripts, refer to [TESTING.md](TESTING.md).

## Project Structure

```
Kitsw_Sairam/
├── css/
│   └── styles.css          # Application styles
├── js/
│   └── script.js           # Frontend JavaScript
├── index.html              # Main HTML file
├── server.js               # Express server
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
├── .gitignore             # Git ignore rules
├── railway.json           # Railway deployment config
├── WHAT_TO_DO.md          # 🎯 Action guide - Start here!
├── VERIFICATION.md        # Quick verification reference (30 sec - 5 min)
├── TESTING.md             # Comprehensive testing guide (detailed)
├── DEPLOYMENT.md          # Deployment instructions
└── README.md              # This file
```

## Deployment to Railway

### Step 1: Prepare Your Repository
Ensure all files are committed to your GitHub repository.

### Step 2: Create a Railway Project
1. Go to [Railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository

### Step 3: Configure Environment Variables
In the Railway dashboard:
1. Go to your project
2. Click on "Variables"
3. Add the following environment variables:
   - `PORT` (Railway sets this automatically)
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `DB_PORT`
   - `NODE_ENV=production`

### Step 4: Add MySQL Database
1. In Railway, click "New"
2. Select "Database"
3. Choose "MySQL"
4. Railway will automatically create the database and provide connection details
5. Copy the connection details to your environment variables

### Step 5: Deploy
Railway will automatically deploy your application. You can view the deployment logs and access your application via the provided URL.

## API Endpoints

### Health Check
```
GET /api/health
```
Returns the status of the API.

### Database Test
```
GET /api/db-test
```
Tests the database connection.

### Future Endpoints (Coming Soon)
- `GET /api/programmes` - List all programmes
- `POST /api/programmes` - Create a new programme
- `GET /api/branches` - List all branches
- `GET /api/batches` - List all batches
- `GET /api/students` - List all students
- `GET /api/courses` - List all courses

## Usage

1. Open the application in your browser
2. Navigate through the sidebar menu
3. Click on "PRE-EXAMINATIONS" to expand the section
4. Click on "Masters" or "Course Master" to see available options
5. Click on any menu item to view its content in the main area

## Features

- ✅ Responsive design (works on mobile, tablet, and desktop)
- ✅ Collapsible navigation menu
- ✅ Professional blue/white theme
- ✅ Smooth animations and transitions
- ✅ Active menu item highlighting
- ✅ Ready for backend integration

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Contact

For any queries or support, please contact the development team.
