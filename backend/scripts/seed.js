require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function seed() {
    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data (optional - comment out if you want to keep existing data)
        console.log('Clearing existing seed data...');
        await pool.query('DELETE FROM submissions WHERE id IN (SELECT id FROM submissions LIMIT 100)');
        await pool.query('DELETE FROM assignments WHERE title LIKE \'%Seed%\'');
        await pool.query('DELETE FROM attendance WHERE id IN (SELECT id FROM attendance LIMIT 100)');
        await pool.query('DELETE FROM subject_enrollments WHERE id IN (SELECT id FROM subject_enrollments LIMIT 100)');
        await pool.query('DELETE FROM subjects WHERE name LIKE \'%Seed%\'');
        await pool.query('DELETE FROM users WHERE email LIKE \'%seed%\'');

        // Create Teachers
        console.log('Creating teachers...');
        const hashedPassword = await bcrypt.hash('password123', 10);
        const teachers = [];
        for (let i = 1; i <= 3; i++) {
            const result = await pool.query(`
                INSERT INTO users (name, email, password, role, teacher_id)
                VALUES ($1, $2, $3, 'TEACHER', $4)
                RETURNING id, name, email
            `, [`Teacher ${i}`, `teacher${i}.seed@unimanage.com`, hashedPassword, `T${1000 + i}`]);
            teachers.push(result.rows[0]);
        }
        console.log(`✅ Created ${teachers.length} teachers`);

        // Create Students
        console.log('Creating students...');
        const studentNames = [
            'John Smith', 'Emma Johnson', 'Michael Brown', 'Sophia Davis',
            'William Wilson', 'Olivia Martinez', 'James Anderson', 'Isabella Garcia',
            'Benjamin Taylor', 'Mia Thomas', 'Lucas Moore', 'Charlotte Jackson',
            'Henry White', 'Amelia Harris', 'Alexander Martin'
        ];

        const students = [];
        for (let i = 0; i < studentNames.length; i++) {
            const result = await pool.query(`
                INSERT INTO users (name, email, password, role, student_id)
                VALUES ($1, $2, $3, 'STUDENT', $4)
                RETURNING id, name, email
            `, [studentNames[i], `${studentNames[i].toLowerCase().replace(' ', '.')}.seed@unimanage.com`, hashedPassword, `S${2000 + i + 1}`]);
            students.push(result.rows[0]);
        }
        console.log(`✅ Created ${students.length} students`);

        // Create Subjects
        console.log('Creating subjects...');
        const subjectData = [
            { name: 'Data Structures (Seed)', code: 'CS201', department: 'Computer Science' },
            { name: 'Database Systems (Seed)', code: 'CS301', department: 'Computer Science' },
            { name: 'Web Development (Seed)', code: 'CS401', department: 'Computer Science' },
            { name: 'Machine Learning (Seed)', code: 'CS501', department: 'Computer Science' },
            { name: 'Software Engineering (Seed)', code: 'CS601', department: 'Computer Science' }
        ];

        const subjects = [];
        for (let i = 0; i < subjectData.length; i++) {
            const teacher = teachers[i % teachers.length];
            const result = await pool.query(`
                INSERT INTO subjects (name, code, department, teacher_id, created_by, schedule_day, schedule_time, schedule_room)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, code
            `, [
                subjectData[i].name,
                subjectData[i].code,
                subjectData[i].department,
                teacher.id,
                teacher.id,
                ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][i],
                ['09:00 AM', '11:00 AM', '02:00 PM', '10:00 AM', '03:00 PM'][i],
                `Room ${101 + i}`
            ]);
            subjects.push(result.rows[0]);
        }
        console.log(`✅ Created ${subjects.length} subjects`);

        // Create Enrollments
        console.log('Creating enrollments...');
        let enrollmentCount = 0;
        for (const subject of subjects) {
            // Enroll 8-12 random students per subject
            const numEnrollments = 8 + Math.floor(Math.random() * 5);
            const shuffledStudents = [...students].sort(() => Math.random() - 0.5);

            for (let i = 0; i < numEnrollments; i++) {
                await pool.query(`
                    INSERT INTO subject_enrollments (subject_id, user_id, student_id)
                    VALUES ($1, $2, $3)
                    ON CONFLICT DO NOTHING
                `, [subject.id, shuffledStudents[i].id, shuffledStudents[i].id]);
                enrollmentCount++;
            }
        }
        console.log(`✅ Created ${enrollmentCount} enrollments`);

        // Create Attendance Records
        console.log('Creating attendance records...');
        let attendanceCount = 0;
        const now = new Date();

        for (let day = 0; day < 7; day++) {
            const date = new Date(now);
            date.setDate(date.getDate() - day);

            for (const subject of subjects) {
                // Get enrolled students for this subject
                const enrolled = await pool.query(`
                    SELECT user_id FROM subject_enrollments WHERE subject_id = $1
                `, [subject.id]);

                // 60-80% attendance rate
                const attendanceRate = 0.6 + Math.random() * 0.2;
                const numAttending = Math.floor(enrolled.rows.length * attendanceRate);

                for (let i = 0; i < numAttending; i++) {
                    const student = students.find(s => s.id === enrolled.rows[i].user_id);
                    if (student) {
                        await pool.query(`
                            INSERT INTO attendance (student_id, name, subject, timestamp, confidence)
                            VALUES ($1, $2, $3, $4, $5)
                        `, [
                            student.id,
                            student.name,
                            subject.name,
                            date.toISOString(),
                            0.85 + Math.random() * 0.15
                        ]);
                        attendanceCount++;
                    }
                }
            }
        }
        console.log(`✅ Created ${attendanceCount} attendance records`);

        // Create Assignments
        console.log('Creating assignments...');
        const assignmentTemplates = [
            { title: 'Homework 1 (Seed)', desc: 'Complete the exercises from Chapter 1' },
            { title: 'Lab Assignment (Seed)', desc: 'Implement the data structure discussed in class' },
            { title: 'Project Proposal (Seed)', desc: 'Submit your project proposal with timeline' },
            { title: 'Quiz Preparation (Seed)', desc: 'Prepare for the upcoming quiz' },
            { title: 'Research Paper (Seed)', desc: 'Write a 5-page research paper on the given topic' }
        ];

        const assignments = [];
        for (const subject of subjects) {
            const numAssignments = 2 + Math.floor(Math.random() * 2); // 2-3 assignments per subject

            for (let i = 0; i < numAssignments; i++) {
                const template = assignmentTemplates[i % assignmentTemplates.length];
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 3 + Math.floor(Math.random() * 7));

                const teacher = teachers.find(t => t.id === subject.id); // Simplified - use first teacher
                const result = await pool.query(`
                    INSERT INTO assignments (subject_id, title, description, due_date, created_by)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, title, subject_id
                `, [
                    subject.id,
                    template.title,
                    template.desc,
                    dueDate.toISOString(),
                    teachers[0].id
                ]);
                assignments.push(result.rows[0]);
            }
        }
        console.log(`✅ Created ${assignments.length} assignments`);

        // Create Submissions
        console.log('Creating submissions...');
        let submissionCount = 0;

        for (const assignment of assignments) {
            // Get enrolled students for this assignment's subject
            const enrolled = await pool.query(`
                SELECT user_id FROM subject_enrollments WHERE subject_id = $1
            `, [assignment.subject_id]);

            // 50-70% submission rate
            const submissionRate = 0.5 + Math.random() * 0.2;
            const numSubmissions = Math.floor(enrolled.rows.length * submissionRate);

            for (let i = 0; i < numSubmissions; i++) {
                const student = students.find(s => s.id === enrolled.rows[i].user_id);
                if (student) {
                    const hasGrade = Math.random() > 0.3; // 70% are graded
                    const grade = hasGrade ? Math.floor(60 + Math.random() * 40) : null;
                    const feedback = hasGrade ? ['Good work!', 'Well done', 'Needs improvement', 'Excellent', 'Keep it up'][Math.floor(Math.random() * 5)] : null;

                    await pool.query(`
                        INSERT INTO submissions (assignment_id, student_id, content, grade, feedback)
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (assignment_id, student_id) DO NOTHING
                    `, [
                        assignment.id,
                        student.id,
                        `This is my submission for ${assignment.title}. I have completed all the requirements.`,
                        grade,
                        feedback
                    ]);
                    submissionCount++;
                }
            }
        }
        console.log(`✅ Created ${submissionCount} submissions`);

        console.log('\n🎉 Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   Teachers: ${teachers.length}`);
        console.log(`   Students: ${students.length}`);
        console.log(`   Subjects: ${subjects.length}`);
        console.log(`   Enrollments: ${enrollmentCount}`);
        console.log(`   Attendance Records: ${attendanceCount}`);
        console.log(`   Assignments: ${assignments.length}`);
        console.log(`   Submissions: ${submissionCount}`);
        console.log('\n💡 Test Credentials:');
        console.log(`   Teacher: teacher1.seed@unimanage.com / password123`);
        console.log(`   Student: student1.seed@unimanage.com / password123`);

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await pool.end();
    }
}

seed();
