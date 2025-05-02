const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, query, orderByChild, equalTo, get, remove, update } = require('firebase/database');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 3000; // Changed to avoid conflicts

// Initialize Firebase
const firebaseConfig = {
    databaseURL: "https://ai-projects-d261b-default-rtdb.firebaseio.com/"
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyAPwSZt1rXur7QzxsMsJCpH9yEAyP0-BbA');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Goal categories and types
const goalCategories = [
    { name: "Fitness", types: ["Weight Loss", "Muscle Gain", "Endurance Training"] },
    { name: "Education", types: ["Course Completion", "Skill Development", "Exam Preparation"] },
    { name: "Career", types: ["Promotion", "Job Change", "Skill Certification"] },
    { name: "Personal", types: ["Habit Formation", "Reading Challenge", "Meditation Practice"] }
];

// Goal session storage
const goalSessions = {};

// System prompt for Goal Tracking
const systemPrompt = `🔐 ROLE: You are an AI Goal Tracking Assistant. Your purpose is to:
1. Help users set and track personal/professional goals
2. Create structured timetables/schedules for goals
3. Provide progress updates and reminders
4. Offer motivational support and suggestions
5. Help adjust goals as needed

STRICT OPERATING PROTOCOLS:

1. GOAL SETTING PHASE:
   - When a user wants to set a goal, collect these details one by one:
     a. "What category does your goal belong to? (Fitness, Education, Career, Personal)"
     b. "What specific goal do you want to achieve? (Be specific)"
     c. "What is your target deadline? (YYYY-MM-DD)"
     d. "How will you measure success for this goal?"
     e. "What are the key milestones or steps needed?"
     f. "How much time can you dedicate daily/weekly?"

2. TIMETABLE CREATION:
   - After goal details are collected, create a structured timetable:
     - Break down into weekly/daily tasks
     - Allocate specific time slots
     - Include buffer time
     - Format clearly with:
       [Day] - [Time]: [Task] (Duration: X mins)
       Example:
       Monday - 7:00 AM: Morning workout (Duration: 30 mins)
       Monday - 8:00 AM: Study new language (Duration: 45 mins)

3. PROGRESS TRACKING:
   - Ask for weekly updates:
     "How is your progress this week on [goal]?"
     "Did you complete all scheduled tasks?"
     "What challenges did you face?"
   - Update progress percentage based on input
   - Adjust timetable if needed

4. RESPONSE FORMATS:
   - For new goals, respond with:
     GOAL_CREATED: {
       "goal_name": "[goal name]",
       "category": "[category]",
       "type": "[type]",
       "deadline": "[deadline]",
       "success_metrics": "[metrics]",
       "milestones": ["milestone1", "milestone2"],
       "time_commitment": "[time]",
       "goal_id": "GL-[8 random chars]",
       "created_date": "[current date]",
       "progress": 0,
       "user_id": "[user id]"
     }
   - For progress updates:
     PROGRESS_UPDATE: {
       "goal_id": "[id]",
       "progress": [percentage],
       "last_updated": "[date]",
       "notes": "[user notes]"
     }

5. TONE:
   - Supportive and encouraging
   - Structured but flexible
   - Clear formatting for schedules
   - Celebratory for achievements

EXAMPLE INTERACTION:

User: I want to set a fitness goal

Assistant: Great! Let's set up your fitness goal.
First, what specific fitness goal do you want to achieve? 
(Examples: "Lose 10 pounds", "Run a 5K", "Gain muscle mass")
`;

// Function to generate a timetable for a goal
function generateTimetable(goalDetails) {
    const { goal_name, time_commitment } = goalDetails;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const timeSlots = [];
    
    // Parse time commitment (e.g., "5 hours per week")
    const hoursPerWeek = parseInt(time_commitment) || 5;
    const dailyHours = Math.min(Math.ceil(hoursPerWeek / 7), 3); // Max 3 slots per day
    
    days.forEach(day => {
        for (let i = 0; i < dailyHours; i++) {
            const hour = 7 + i * 3; // Starting at 7AM with 3 hour gaps
            timeSlots.push({
                day,
                time: `${hour}:00`,
                task: `Work on ${goal_name}`,
                duration: 60,
                completed: false
            });
        }
    });
    
    return timeSlots;
}

// Email template for goal confirmation
function createGoalEmailHTML(goalDetails) {
    const progressPercentage = goalDetails.progress || 0;
    const progressColor = progressPercentage < 30 ? '#ff4d4f' : 
                         progressPercentage < 70 ? '#faad14' : '#52c41a';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goal Confirmation</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; background-color: #f9f9f9; border-radius: 0 0 8px 8px; }
        .goal-details { background-color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
        .progress-container { margin: 15px 0; }
        .progress-bar { height: 20px; background-color: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 10px; transition: width 0.5s ease; }
        .progress-text { text-align: center; margin-top: 5px; font-weight: bold; }
        .timetable { margin-top: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
        .timetable-item { padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .timetable-item:last-child { border-bottom: none; }
        .timetable-time { font-weight: bold; color: #4CAF50; }
        .milestone { margin: 10px 0; padding-left: 15px; border-left: 3px solid #4CAF50; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Your Goal Has Been Created! 🎯</h1>
    </div>
    <div class="content">
        <p>Hello Goal-Setter,</p>
        <p>Your goal <strong>${goalDetails.goal_name}</strong> has been successfully created.</p>
        
        <div class="goal-details">
            <h3>Goal Details</h3>
            <p><strong>Category:</strong> ${goalDetails.category}</p>
            <p><strong>Type:</strong> ${goalDetails.type || 'Not specified'}</p>
            <p><strong>Deadline:</strong> ${goalDetails.deadline}</p>
            <p><strong>Success Metrics:</strong> ${goalDetails.success_metrics}</p>
            
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%; background-color: ${progressColor};"></div>
                </div>
                <p class="progress-text">Current Progress: ${progressPercentage}%</p>
            </div>
            
            ${goalDetails.milestones && goalDetails.milestones.length > 0 ? `
            <h4>Milestones</h4>
            ${goalDetails.milestones.map(milestone => `
                <div class="milestone">
                    <p>${milestone}</p>
                </div>
            `).join('')}
            ` : ''}
            
            <div class="timetable">
                <h4>Suggested Timetable</h4>
                ${goalDetails.timetable ? goalDetails.timetable.map(item => `
                    <div class="timetable-item">
                        <span><strong>${item.day}</strong> - ${item.time}: ${item.task}</span>
                        <span class="timetable-time">${item.duration} mins</span>
                    </div>
                `).join('') : '<p>No timetable generated yet</p>'}
            </div>
        </div>
        
        <p>You'll receive regular progress updates and reminders to keep you on track.</p>
        <p>Best regards,<br>Your Goal Tracking Assistant</p>
    </div>
</body>
</html>
    `;
}

// Email transporter setup
async function sendGmail(toEmail, message) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        pool: true,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'btechcodingwallah@gmail.com',
            pass: 'uxfs frot sarj ntiy'
        },
        tls: {
            rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        socketTimeout: 30000,
        greetingTimeout: 30000,
        dnsTimeout: 10000
    });

    try {
        await transporter.verify();
    } catch (verifyError) {
        console.error('Error verifying transporter:', verifyError);
        return { success: false, error: 'Email service not available' };
    }

    const mailOptions = {
        from: 'Goal Tracker <btechcodingwallah@gmail.com>',
        to: toEmail,
        subject: 'Your Goal Tracking Update',
        html: message
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        transporter.close();
        return {
            success: false,
            error: error.message || 'Failed to send email'
        };
    } finally {
        transporter.close();
    }
}

// Main goal tracking endpoint
app.post('/api/goal-tracker', async (req, res) => {
    try {
        const { query, sessionId, userId } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Initialize or retrieve session
        const session = sessionId ? goalSessions[sessionId] : null;
        const currentSessionId = sessionId || `goal-session-${Date.now()}`;

        // Prepare chat history
        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: systemPrompt }]
                },
                {
                    role: "model",
                    parts: [{ text: "Hello! I'm your Goal Tracking assistant. Would you like help setting a new goal or tracking an existing one?" }]
                },
                ...(session?.history || [])
            ]
        });

        // Add current query to history
        if (session) {
            session.history.push({
                role: "user",
                parts: [{ text: query }]
            });
        }

        // Get response
        const result = await chat.sendMessage(query);
        const response = await result.response;
        let text = response.text();

        // Check for new goal creation
        const goalCreatedRegex = /GOAL_CREATED: (\{.*?\})/s;
        const goalMatch = text.match(goalCreatedRegex);

        if (goalMatch) {
            try {
                const goalDetails = JSON.parse(goalMatch[1]);
                
                // Generate timetable for the goal
                const timetable = generateTimetable(goalDetails);
                goalDetails.timetable = timetable;
                goalDetails.user_id = userId;
                goalDetails.created_date = new Date().toISOString().split('T')[0];
                
                // Store in Firebase
                const sanitizedUserId = userId.replace(/\./g, '_');
                const goalsRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}`);
                const newGoalRef = push(goalsRef);
                await set(newGoalRef, goalDetails);
                
                text = text.replace(goalCreatedRegex, '');
                
                // Send confirmation email if email is available
                if (userId.includes('@')) {
                    const htmlEmail = createGoalEmailHTML(goalDetails);
                    await sendGmail(userId, htmlEmail);
                }
            } catch (error) {
                console.error('Error processing goal creation:', error);
            }
        }

        // Check for progress update
        const progressUpdateRegex = /PROGRESS_UPDATE: (\{.*?\})/s;
        const progressMatch = text.match(progressUpdateRegex);

        if (progressMatch) {
            try {
                const { goal_id, progress, notes } = JSON.parse(progressMatch[1]);
                const sanitizedUserId = userId.replace(/\./g, '_');
                
                // Find and update the goal
                const goalsRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}`);
                const snapshot = await get(goalsRef);

                if (snapshot.exists()) {
                    let goalKey = null;
                    let goalDetails = null;
                    
                    snapshot.forEach((childSnapshot) => {
                        const goal = childSnapshot.val();
                        if (goal.goal_id === goal_id) {
                            goalKey = childSnapshot.key;
                            goalDetails = goal;
                        }
                    });

                    if (goalKey) {
                        const updates = {
                            progress: parseInt(progress),
                            last_updated: new Date().toISOString().split('T')[0],
                            notes: notes || ''
                        };
                        
                        const goalRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}/${goalKey}`);
                        await update(goalRef, updates);
                        
                        text = text.replace(progressUpdateRegex, '');
                        text += `\n\nProgress updated to ${progress}% for goal "${goalDetails.goal_name}"`;
                        
                        // Send progress update email if email is available
                        if (userId.includes('@')) {
                            const updatedGoal = { ...goalDetails, ...updates };
                            const htmlEmail = createGoalEmailHTML(updatedGoal);
                            await sendGmail(userId, htmlEmail);
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing progress update:', error);
            }
        }

        // Update session
        if (!goalSessions[currentSessionId]) {
            goalSessions[currentSessionId] = {
                history: [{
                    role: "user",
                    parts: [{ text: query }]
                }, {
                    role: "model",
                    parts: [{ text: text }]
                }]
            };
        } else {
            goalSessions[currentSessionId].history.push({
                role: "model",
                parts: [{ text: text }]
            });
        }

        res.json({
            response: text,
            sessionId: currentSessionId,
            isGoalSettingInProgress: text.includes("goal") || text.includes("target"),
            isProgressUpdateInProgress: text.includes("progress") || text.includes("update")
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// Get user's goals
app.get('/api/user-goals/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const sanitizedUserId = userId.replace(/\./g, '_');
        const goalsRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}`);
        const snapshot = await get(goalsRef);

        if (snapshot.exists()) {
            const goals = [];
            snapshot.forEach((childSnapshot) => {
                goals.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            res.json({ goals });
        } else {
            res.json({ goals: [] });
        }
    } catch (error) {
        console.error('Error fetching goals:', error);
        res.status(500).json({ error: 'An error occurred while fetching goals' });
    }
});

// Update a goal
app.put('/api/update-goal/:userId/:goalId', async (req, res) => {
    try {
        const { userId, goalId } = req.params;
        const updates = req.body;
        const sanitizedUserId = userId.replace(/\./g, '_');
        
        const goalRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}/${goalId}`);
        await update(goalRef, updates);
        
        res.json({ success: true, message: 'Goal updated successfully' });
    } catch (error) {
        console.error('Error updating goal:', error);
        res.status(500).json({ error: 'An error occurred while updating the goal' });
    }
});

// Delete a goal
app.delete('/api/delete-goal/:userId/:goalId', async (req, res) => {
    try {
        const { userId, goalId } = req.params;
        const sanitizedUserId = userId.replace(/\./g, '_');
        
        const goalRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}/${goalId}`);
        await remove(goalRef);
        
        res.json({ success: true, message: 'Goal deleted successfully' });
    } catch (error) {
        console.error('Error deleting goal:', error);
        res.status(500).json({ error: 'An error occurred while deleting the goal' });
    }
});

// Complete a timetable item
app.put('/api/complete-task/:userId/:goalId/:taskIndex', async (req, res) => {
    try {
        const { userId, goalId, taskIndex } = req.params;
        const sanitizedUserId = userId.replace(/\./g, '_');
        
        const goalRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}/${goalId}`);
        const snapshot = await get(goalRef);
        
        if (!snapshot.exists()) {
            return res.status(404).json({ error: 'Goal not found' });
        }
        
        const goal = snapshot.val();
        if (!goal.timetable || !goal.timetable[taskIndex]) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Update the specific task
        const updatedTimetable = [...goal.timetable];
        updatedTimetable[taskIndex].completed = true;
        
        // Calculate new progress
        const completedTasks = updatedTimetable.filter(task => task.completed).length;
        const newProgress = Math.round((completedTasks / updatedTimetable.length) * 100);
        
        await update(goalRef, {
            timetable: updatedTimetable,
            progress: newProgress,
            last_updated: new Date().toISOString().split('T')[0]
        });
        
        res.json({ 
            success: true, 
            message: 'Task marked as completed',
            newProgress
        });
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'An error occurred while completing the task' });
    }
});

// Session cleanup
function cleanupSessions() {
    const now = Date.now();
    const oneHour = 3600000;

    for (const [id, session] of Object.entries(goalSessions)) {
        const sessionTime = parseInt(id.split('-')[2]);
        if (now - sessionTime > oneHour) {
            delete goalSessions[id];
        }
    }
}

// Clean up sessions every hour
setInterval(cleanupSessions, 3600000);

app.listen(port, () => {
    console.log(`Goal Tracker System running on port ${port}`);
});