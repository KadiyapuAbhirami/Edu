# Admin User Implementation TODO

## Plan Progress Tracker

### 1. [✅] Install dependencies
   - bcryptjs, jsonwebtoken, express-rate-limit
   - Command: `npm install bcryptjs jsonwebtoken express-rate-limit`

### 2. [✅] Update database models (uploads/db.js)
   - Add User model (username, email, hashed password, role)
   - Add StudentSelection model (userId, year, branch, regulation)
   - Add FacultyProfile model (userId, details)
   - Export updated functions/models

### 3. [ ] Seed admin user
   - Create script or direct insert: username='admin', password='admin123' (hashed)
   - Ensure DB connection

### 4. [✅] Update server.js
   - Import/connect DB
   - Add JWT secret to .env
   - Add auth middleware
   - Add /api/login, /api/register endpoints
   - Add protected routes for student/faculty
   - Add admin-only data APIs

### 5. [✅] Update login.html
   - Add admin user type
   - Replace fake login with API call
   - Store JWT, redirect by role

### 6. [✅] Add auth checks to protected pages
   - student_selection.html, faculty_final.html, etc.
   - Verify JWT, save selections to DB

### 7. [✅] Create admin dashboard
   - public/admin_dashboard.html
   - Fetch/display all students/faculty data
   - Links to other sections

### 8. [✅] Create .env
   - JWT_SECRET

### 9. [ ] Test complete flow
   - Login as admin, view data
   - Student/faculty login/register
   - PDF generation still works

**Next Step: 1. Install dependencies**

