import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    CalendarCheck,
    BookOpen,
    LogOut,
    Menu,
    X,
    MessageSquare,
    Sun,
    Moon,
    Bell,
    User,
    FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '../utils/api';
import api from '../utils/api';
import { io } from 'socket.io-client';

const SidebarItem = ({ icon: Icon, label, to, active }) => (
    <Link
        to={to}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${active
            ? 'bg-white/20 text-white shadow-lg'
            : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
    >
        <Icon size={20} className={active ? 'text-white' : 'group-hover:text-white'} />
        <span className="font-medium">{label}</span>
        {active && (
            <motion.div
                layoutId="active-pill"
                className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            />
        )}
    </Link>
);

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isDark, setIsDark] = useState(false); // Changed to light mode by default
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [user, setUser] = useState({});
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setUser(storedUser);

        if (storedUser.id) {
            fetchNotifications();

            const socketEndpoint = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001';
            const socket = io(socketEndpoint);
            socket.emit('join_user_room', storedUser.id);

            socket.on('receive_notification', (notif) => {
                setNotifications(prev => [notif, ...prev]);
            });

            return () => socket.disconnect();
        }
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/notifications');
            setNotifications(data);
        } catch (e) {
            console.error('Failed to fetch notifications');
        }
    };

    const markAllRead = async () => {
        try {
            await api.put('/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (e) { }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        if (storedTheme === 'dark') {
            setIsDark(true);
        }
    }, []);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDark]);

    const handleLogout = () => {
        auth.clear();
        navigate('/login');
        window.location.reload(); // Ensure clean state
    };

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
        { icon: Users, label: 'Students', to: '/students', roles: ['TEACHER', 'ADMIN'] },
        { icon: CalendarCheck, label: 'Attendance', to: '/attendance' },
        { icon: BookOpen, label: 'Subjects', to: '/subjects' },
        { icon: FileText, label: 'Assignments', to: '/assignments' },
        { icon: MessageSquare, label: 'Chat', to: '/chat' },
        { icon: User, label: 'Profile', to: '/profile' },
    ].filter(item => !item.roles || item.roles.includes(user.role));

    return (
        <div className="min-h-screen flex overflow-hidden bg-background text-foreground transition-colors duration-300">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && window.innerWidth < 1024 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out ${isDark ? 'bg-card border-border' : 'bg-gradient-to-b from-indigo-600 to-purple-700 border-indigo-500'
                    } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20 lg:hover:w-64'} group/sidebar`}
                initial={false}
            >
                <div className="h-full flex flex-col">
                    {/* Logo */}
                    <div className={`h-16 flex items-center px-6 border-b ${isDark ? 'border-gray-800' : 'border-white/20'}`}>
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 shadow-lg">
                            <span className="text-indigo-600 font-bold">U</span>
                        </div>
                        <span className={`ml-3 font-bold text-xl text-white lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap`}>
                            UniManage
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                        {menuItems.map((item) => (
                            <SidebarItem
                                key={item.to}
                                {...item}
                                active={location.pathname === item.to}
                            />
                        ))}
                    </nav>

                    {/* User Profile / Logout */}
                    <div className={`p-4 border-t ${isDark ? 'border-gray-800' : 'border-white/20'}`}>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-white/90 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <LogOut size={20} />
                            <span className="font-medium lg:opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap">
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-background">
                {/* Header */}
                <header className="h-16 border-b bg-card border-border flex items-center justify-between px-6 sticky top-0 z-30 transition-colors duration-300">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 rounded-lg lg:hidden hover:bg-gray-100 text-gray-700"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-semibold hidden sm:block capitalize text-foreground">
                            {location.pathname.split('/')[1] || 'Dashboard'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDark(!isDark)}
                            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                        >
                            {isDark ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* Notifications */}
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground relative transition-colors"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                                )}
                            </button>

                            <AnimatePresence>
                                {showNotifications && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border bg-card border-border overflow-hidden z-50"
                                    >
                                        <div className="p-3 border-b border-border flex justify-between items-center">
                                            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button onClick={markAllRead} className="text-xs text-indigo-500 hover:text-indigo-400">
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto">
                                            {notifications.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-muted-foreground">
                                                    No notifications
                                                </div>
                                            ) : (
                                                notifications.map(notif => (
                                                    <div
                                                        key={notif.id}
                                                        className={`p-3 border-b last:border-0 text-sm hover:bg-accent transition-colors ${!notif.read ? 'bg-primary/5' : ''} border-border`}
                                                    >
                                                        <p className="text-foreground">{notif.message}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 p-[2px]">
                            <div className="w-full h-full rounded-full flex items-center justify-center font-medium bg-white text-indigo-600">
                                {user?.name?.[0] || 'U'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-background">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
