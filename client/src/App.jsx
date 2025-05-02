import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from '@clerk/clerk-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { useTheme } from './components/theme-provider';
import { Button } from './components/ui/button';
import { ModeToggle } from './components/mode-toggle';
import { PrivacyPolicy } from './PrivacyPolicy';
import { TermsOfService } from './TermsOfService';
import './App.css';

// Firebase configuration
const firebaseConfig = {
  databaseURL: "https://ai-projects-d261b-default-rtdb.firebaseio.com/"
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/goals" element={<GoalDashboard />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
        </Routes>
        <Footer />
        <GoalAssistant />
      </div>
    </Router>
  );
}

function Navbar() {
  const { theme } = useTheme();
  const { user } = useUser();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${theme}`}>
      <div className="navbar-container">
        <Link to="/" className="logo">
          <h1>GoalTracker</h1>
        </Link>

        <div className="nav-links">
          <Link to="/" className={isActive('/') ? 'active' : ''}>Home</Link>
          <Link to="/goals" className={isActive('/goals') ? 'active' : ''}>My Goals</Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''}>About</Link>

          <div className="auth-section">
            <SignedOut>
              <SignInButton>
                <Button className="sign-in-btn">Sign In</Button>
              </SignInButton>
            </SignedOut>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              {user && <span className="user-greeting">Hi, {user.firstName}</span>}
            </SignedIn>

            <div className="theme-toggle-container">
              <ModeToggle />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function HomePage() {
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
  };

  const [stats, setStats] = useState({
    goals: 0,
    completed: 0,
    users: 0,
  });

  useEffect(() => {
    const targetStats = {
      goals: 12500,
      completed: 8500,
      users: 15000,
    };

    const duration = 2000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);

    let frame = 0;
    const counter = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;

      setStats({
        goals: Math.floor(targetStats.goals * progress),
        completed: Math.floor(targetStats.completed * progress),
        users: Math.floor(targetStats.users * progress),
      });

      if (frame === totalFrames) {
        clearInterval(counter);
      }
    }, frameDuration);

    return () => clearInterval(counter);
  }, []);

  return (
    <div className="home-page">
      <div className="hero-slider">
        <Slider {...sliderSettings}>
          <div className="slide">
            <img src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Goal 1" />
            <div className="slide-content">
              <h2>Achieve Your Goals</h2>
              <p>Plan, track, and accomplish anything</p>
            </div>
          </div>
          <div className="slide">
            <img src="https://images.unsplash.com/photo-1541532713592-79a0317b6b77?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Goal 2" />
            <div className="slide-content">
              <h2>Stay Organized</h2>
              <p>Custom schedules and reminders</p>
            </div>
          </div>
          <div className="slide">
            <img src="https://images.unsplash.com/photo-1545205597-3d9d02c29597?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" alt="Goal 3" />
            <div className="slide-content">
              <h2>Track Progress</h2>
              <p>Visualize your journey to success</p>
            </div>
          </div>
        </Slider>
      </div>

      <div className="stats-section">
        <div className="stat-card">
          <h3>Goals Set</h3>
          <div className="count">{stats.goals.toLocaleString()}+</div>
        </div>
        <div className="stat-card">
          <h3>Goals Completed</h3>
          <div className="count">{stats.completed.toLocaleString()}+</div>
        </div>
        <div className="stat-card">
          <h3>Active Users</h3>
          <div className="count">{stats.users.toLocaleString()}+</div>
        </div>
      </div>

      <div className="features-section">
        <div className="feature">
          <i className="icon">🎯</i>
          <h3>Goal Setting</h3>
          <p>Define clear objectives with measurable outcomes</p>
        </div>
        <div className="feature">
          <i className="icon">📅</i>
          <h3>Smart Scheduling</h3>
          <p>Automated timetable generation based on your availability</p>
        </div>
        <div className="feature">
          <i className="icon">📊</i>
          <h3>Progress Tracking</h3>
          <p>Visual progress indicators and milestone tracking</p>
        </div>
      </div>

      <div className="how-it-works">
        <h2>How GoalTracker Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Define Your Goal</h3>
            <p>Set clear objectives and success metrics</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h3>Create Schedule</h3>
            <p>Get a personalized timetable for your goal</p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h3>Track Progress</h3>
            <p>Update your progress and get insights</p>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <h3>Achieve Success</h3>
            <p>Celebrate your accomplishments</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalDashboard() {
  const { user } = useUser();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const sanitizedUserId = user.id.replace(/\./g, '_');
      const goalsRef = ref(database, `Goal_Tracker_System/user_goals/${sanitizedUserId}`);

      onValue(goalsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const goalsArray = Object.entries(data).map(([key, value]) => ({
            id: key,
            ...value
          }));
          setGoals(goalsArray);
        } else {
          setGoals([]);
        }
        setLoading(false);
      });
    }
  }, [user]);

  const calculateProgressStyle = (progress) => ({
    width: `${progress}%`,
    backgroundColor: progress < 30 ? '#ff4d4f' : progress < 70 ? '#faad14' : '#52c41a'
  });

  if (!user) {
    return (
      <div className="goal-dashboard">
        <h2>My Goals</h2>
        <div className="sign-in-prompt">
          <p>Please sign in to view and manage your goals</p>
          <SignInButton>
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="goal-dashboard">
        <h2>My Goals</h2>
        <p>Loading your goals...</p>
      </div>
    );
  }

  return (
    <div className="goal-dashboard">
      <div className="dashboard-header">
        <h2>My Goals</h2>
        <Button className="new-goal-btn">+ New Goal</Button>
      </div>

      {goals.length === 0 ? (
        <div className="no-goals">
          <p>You don't have any goals yet. Create your first goal using our assistant!</p>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((goal) => (
            <div key={goal.id} className="goal-card">
              <div className="goal-header">
                <h3>{goal.goal_name}</h3>
                <span className="goal-id">{goal.goal_id}</span>
              </div>
              <div className="goal-details">
                <p><strong>Deadline:</strong> {goal.deadline}</p>
                <p><strong>Success Metrics:</strong> {goal.success_metrics}</p>
                <p><strong>Time Commitment:</strong> {goal.time_commitment}</p>
              </div>
              <div className="progress-container">
                <div className="progress-bar">
                  <div className="progress-fill" style={calculateProgressStyle(goal.progress || 0)}></div>
                </div>
                <span className="progress-text">{goal.progress || 0}% Complete</span>
              </div>
              <div className="goal-actions">
                <Button variant="outline">Update Progress</Button>
                <Button variant="outline">View Schedule</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AboutPage() {
  return (
    <div className="about-page">
      <h2>About GoalTracker</h2>
      <p className="about-description">
        GoalTracker helps individuals and teams set, track, and achieve their personal and professional goals.
        Our AI-powered system creates personalized plans and keeps you accountable.
      </p>

      <h3>Our Team</h3>
      <div className="developers-grid">
        <div className="developer-card">
          <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Developer 1" />
          <h4>John Doe</h4>
          <p className="role">Product Manager</p>
          <p className="bio">Specializes in goal-setting methodologies</p>
        </div>
        
        <div className="developer-card">
          <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Developer 2" />
          <h4>Jane Smith</h4>
          <p className="role">Lead Developer</p>
          <p className="bio">Focuses on AI scheduling algorithms</p>
        </div>
        
        <div className="developer-card">
          <img src="https://randomuser.me/api/portraits/men/75.jpg" alt="Developer 3" />
          <h4>Mike Johnson</h4>
          <p className="role">UX Designer</p>
          <p className="bio">Creates intuitive tracking interfaces</p>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>GoalTracker</h3>
          <p>Your personal achievement companion.</p>
        </div>
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/goals">My Goals</Link></li>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/privacy-policy">Privacy Policy</Link></li>
            <li><Link to="/terms-of-service">Terms of Service</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Contact</h4>
          <ul>
            <li>Email: support@goaltracker.com</li>
            <li>Phone: +1 (555) 123-4567</li>
            <li>Address: 123 Success Ave, Goal City</li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} GoalTracker. All rights reserved.</p>
      </div>
    </footer>
  );
}

function GoalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'bot', text: "Hello! I'm your Goal Tracking assistant. Would you like help setting a new goal or tracking an existing one?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const { user } = useUser();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = { sender: 'user', text: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await fetch('http://localhost:3000/api/goal-tracker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: inputValue,
          sessionId: sessionId,
          userId: user?.id
        }),
      });

      const data = await response.json();
      if (!sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages(prev => [...prev, { sender: 'bot', text: data.response }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <>
      <button className="assistant-icon" onClick={() => setIsOpen(!isOpen)}>
        <span className="icon">🎯</span>
      </button>

      {isOpen && (
        <div className="assistant-container">
          <div className="assistant-header">
            <h3>Goal Tracking Assistant</h3>
            <button onClick={() => setIsOpen(false)}>×</button>
          </div>
          <div className="assistant-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="message bot typing">
                <span className="typing-dots">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="assistant-input">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
            />
            <button onClick={handleSendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}

export default App;