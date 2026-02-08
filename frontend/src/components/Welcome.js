import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Shield, Activity, ChevronRight, LayoutDashboard, Map, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Welcome = () => {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    // Conditional styling helpers
    const isDark = theme === 'dark';

    // Background style
    const bgStyle = isDark
        ? { background: 'radial-gradient(circle at top right, #1e293b, #0f172a)' }
        : { background: 'radial-gradient(circle at top right, #f8fafc, #e2e8f0)' };

    // Text colors
    const textMain = isDark ? 'text-white' : 'text-dark';
    const textMuted = isDark ? 'text-white-50' : 'text-secondary';
    const cardBg = isDark ? 'bg-dark bg-opacity-50' : 'bg-white bg-opacity-50';
    const cardBorder = isDark ? 'border-white border-opacity-10' : 'border-dark border-opacity-10';

    return (
        <div className="min-vh-100 d-flex flex-column transition-all" style={bgStyle}>

            {/* Navbar */}
            <nav className="navbar navbar-expand-lg py-3">
                <div className="container">
                    <div className="d-flex align-items-center gap-2">
                        <div className="bg-primary bg-gradient rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                            <Rocket className="text-white" size={24} />
                        </div>
                        <span className={`h4 fw-bold ${textMain} mb-0 tracking-tight`}>NeuroFleetX</span>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center border-0 ${isDark ? 'bg-white bg-opacity-10 text-white' : 'bg-dark bg-opacity-10 text-dark'}`}
                            style={{ width: 40, height: 40 }}
                            title="Toggle Theme"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="d-flex gap-2">
                            <button
                                className={`btn ${isDark ? 'btn-outline-light' : 'btn-outline-dark'} border-0 fw-bold`}
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </button>
                            <button
                                className="btn btn-primary fw-bold px-4"
                                onClick={() => navigate('/register')}
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="flex-grow-1 d-flex align-items-center position-relative overflow-hidden">
                {/* Background Decor */}
                <div className={`position-absolute top-0 end-0 bg-primary opacity-10 rounded-circle blur-3xl`} style={{ width: '600px', height: '600px', filter: 'blur(100px)', transform: 'translate(30%, -30%)' }}></div>
                <div className={`position-absolute bottom-0 start-0 bg-secondary opacity-10 rounded-circle blur-3xl`} style={{ width: '500px', height: '500px', filter: 'blur(100px)', transform: 'translate(-30%, 30%)' }}></div>

                <div className="container position-relative z-1">
                    <div className="row align-items-center g-5">
                        <div className={`col-lg-6 ${textMain} animate-fade-in`}>
                            <div className={`d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill ${isDark ? 'bg-white bg-opacity-10 border-white' : 'bg-dark bg-opacity-10 border-dark'} border-opacity-20 mb-4`}>
                                <span className="badge bg-primary rounded-pill">New</span>
                                <span className="small">AI-Powered Fleet Optimization v2.0</span>
                            </div>
                            <h1 className="display-3 fw-bold mb-4 leading-tight">
                                The Future of <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-info" style={{ background: 'linear-gradient(to right, #6366f1, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                    Fleet Intelligence
                                </span>
                            </h1>
                            <p className={`lead ${textMuted} mb-5`} style={{ maxWidth: '500px' }}>
                                Advanced telemetry, predictive maintenance, and real-time logistics management in a single digital cockpit.
                            </p>
                            <div className="d-flex gap-3 flex-column flex-sm-row">
                                <button
                                    className="btn btn-primary btn-lg px-5 py-3 fw-bold d-flex align-items-center justify-content-center gap-2 shadow-lg hover-elevate"
                                    onClick={() => navigate('/register')}
                                >
                                    Start Free Trial <ChevronRight size={20} />
                                </button>
                                <button
                                    className={`btn ${isDark ? 'btn-outline-light' : 'btn-outline-dark'} btn-lg px-5 py-3 fw-bold hover-bg-light`}
                                    onClick={() => navigate('/login')}
                                >
                                    Live Demo
                                </button>
                            </div>
                        </div>

                        <div className="col-lg-6 d-none d-lg-block">
                            <div className="position-relative">
                                {/* Abstract Dashboard Mockup */}
                                <div className={`card border-0 ${cardBg} backdrop-blur shadow-2xl rounded-4 p-2`} style={{ transform: 'perspective(1000px) rotateY(-10deg) rotateX(5deg)', backdropFilter: 'blur(20px)' }}>
                                    <div className={`card-body ${isDark ? 'bg-dark' : 'bg-white'} rounded-3 border ${cardBorder} p-4`}>
                                        <div className="d-flex justify-content-between mb-4">
                                            <div className="d-flex gap-2">
                                                <div className="bg-danger rounded-circle" style={{ width: 12, height: 12 }}></div>
                                                <div className="bg-warning rounded-circle" style={{ width: 12, height: 12 }}></div>
                                                <div className="bg-success rounded-circle" style={{ width: 12, height: 12 }}></div>
                                            </div>
                                            <div className={`${textMuted} small`}>Dashboard Preview</div>
                                        </div>
                                        <div className="row g-3">
                                            <div className="col-8">
                                                <div className={`${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-3 h-100 p-3`}>
                                                    <div className="d-flex align-items-center gap-3 mb-3">
                                                        <div className="p-2 bg-primary rounded-3"><LayoutDashboard size={16} className="text-white" /></div>
                                                        <div className={`h6 ${textMain} mb-0`}>Live Operations</div>
                                                    </div>
                                                    <div className={`w-100 ${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-pill mb-2`} style={{ height: 8 }}></div>
                                                    <div className={`w-75 ${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-pill`} style={{ height: 8 }}></div>
                                                </div>
                                            </div>
                                            <div className="col-4">
                                                <div className={`${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-3 p-3 mb-3`}>
                                                    <Activity size={16} className="text-success mb-2" />
                                                    <div className={`h4 ${textMain} mb-0`}>98%</div>
                                                    <small className={`${textMuted}`} style={{ fontSize: 10 }}>Efficiency</small>
                                                </div>
                                                <div className={`${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-3 p-3`}>
                                                    <Shield size={16} className="text-info mb-2" />
                                                    <div className={`h4 ${textMain} mb-0`}>Safe</div>
                                                    <small className={`${textMuted}`} style={{ fontSize: 10 }}>Status</small>
                                                </div>
                                            </div>
                                            <div className="col-12">
                                                <div className={`${isDark ? 'bg-white' : 'bg-dark'} bg-opacity-10 rounded-3 p-3 d-flex align-items-center justify-content-center`} style={{ height: 100 }}>
                                                    <Map className={`${textMuted}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className={`py-4 text-center border-top ${cardBorder}`}>
                <div className="container">
                    <small className={`${textMuted}`}>&copy; 2026 NeuroFleetX Team. All rights reserved.</small>
                </div>
            </footer>
        </div>
    );
};

export default Welcome;
