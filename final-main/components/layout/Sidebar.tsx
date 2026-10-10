'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    BookOpen,
    Target as TargetIcon,
    TrendingUp,
    FolderTree,
    Users,
    University,
    LibraryBig,
    LogOut,
    UploadCloud,
    FileText,
    Network,
    Bell,
    Building2,
    X,
    GraduationCap,
    Search,
    Sun,
    Moon,
    MessageSquare,
    Globe2,
    Settings,
    BrainCircuit,
    LayoutTemplate,
    Flag,
    CalendarDays,
    ClipboardList,
    Trophy,
    UserRound,
    Store
} from 'lucide-react';
import { useUI } from '@/lib/context/UIContext';
import { AuthService } from '@/lib/services/authService';
import MobileBottomNav from './MobileBottomNav';

interface SidebarProps {
    userRole: 'super_admin' | 'institution_admin' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ userRole }) => {
    const { isSidebarOpen, closeSidebar, isSidebarCollapsed, setSidebarCollapsed } = useUI();
    const pathname = usePathname();
    const navRef = React.useRef<HTMLDivElement>(null);
    const [currentUser, setCurrentUser] = React.useState<any>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const user = AuthService.getCurrentUser();
            setCurrentUser(user);
        };
        fetchUser();
    }, []);

    const isActive = (path: string, exact = false) => {
        if (exact) return pathname === path;
        // special case for root dashboard paths to prevent double highlighting
        if (path === '/admin/dashboard' || path === '/institution-admin' || path === '/dashboard') {
            return pathname === path;
        }
        
        // Prevent Assigned Tasks from matching Task Reports
        if (path === '/institution-admin/assignments' && pathname.startsWith('/institution-admin/assignments/reports')) {
            return false;
        }

        return pathname === path || pathname.startsWith(path + '/');
    };

    const handleLogout = async () => {
        await AuthService.logout();
        window.location.href = '/login';
    };

    const isSuperAdmin = userRole === 'super_admin';
    const isAdmin = userRole !== 'student';

    // Preserve scroll position
    useEffect(() => {
        const savedScrollPos = sessionStorage.getItem('sidebar-scroll-position');
        if (savedScrollPos && navRef.current) {
            navRef.current.scrollTop = parseInt(savedScrollPos, 10);
        }
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            if (navRef.current) {
                sessionStorage.setItem('sidebar-scroll-position', navRef.current.scrollTop.toString());
            }
        };

        const navElement = navRef.current;
        if (navElement) {
            navElement.addEventListener('scroll', handleScroll);
            return () => navElement.removeEventListener('scroll', handleScroll);
        }
    }, []);

    // Initial state handling: Super Admins always see it expanded
    useEffect(() => {
        if (isSuperAdmin) {
            setSidebarCollapsed(false);
        }
    }, [isSuperAdmin, setSidebarCollapsed]);

    useEffect(() => {
        if (!isSidebarOpen || window.innerWidth >= 1024) return;
        const originalOverflow = document.body.style.overflow;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') closeSidebar();
        };
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isSidebarOpen, closeSidebar]);

    // Navigation items based on user role
    const getNavItems = () => {
        const studentItems = [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard', section: 'General' },
            { icon: Network, label: 'Connect', href: '/connect', section: 'General' },
            { icon: Trophy, label: 'Leaderboard', href: '/leaderboard', section: 'General' },
            { icon: LibraryBig, label: 'University Library', href: '/university', section: 'General', tourId: 'sidebar-university' },
            { icon: Globe2, label: 'Global Exams', href: '/test-sections', section: 'General' },
            { icon: TargetIcon, label: 'Practice', href: '/practice', section: 'General' },
            { icon: TrendingUp, label: 'Progress', href: '/progress', section: 'General' },
            { icon: BrainCircuit, label: 'Deep Insights', href: '/dashboard/analytics', section: 'General' },
            { icon: TargetIcon, label: 'Assigned Tasks', href: '/dashboard/tasks', section: 'General' },
            { icon: Bell, label: 'Notifications', href: '/notifications', section: 'General' },
            { icon: CalendarDays, label: 'Academic Calendar', href: '/calendar', section: 'General' },
            { icon: UserRound, label: 'Profile', href: '/profile', section: 'General' },
        ];

        const adminItems = [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/admin/dashboard', section: 'Main' },
            { icon: Trophy, label: 'Leaderboard', href: '/admin/students', section: 'Main' },
            { icon: Bell, label: 'Notifications', href: '/admin/notifications', section: 'Main' },
            { icon: CalendarDays, label: 'Academic Calendar', href: '/admin/calendar', section: 'Main' },
            { icon: TrendingUp, label: 'Analytics', href: '/admin/analytics', section: 'Main' },
            { icon: TargetIcon, label: 'University Analytics', href: '/admin/university-analytics', section: 'Main' },
            { icon: Globe2, label: 'Global Exam Analytics', href: '/admin/global-exam-analytics', section: 'Main' },

            { header: 'ECOSYSTEM' },
            { icon: LayoutTemplate, label: 'Landing Page', href: '/admin/landing-settings', section: 'Ecosystem' },
            { icon: Globe2, label: 'Global Exams', href: '/admin/test-sections', section: 'Ecosystem' },
            { icon: University, label: 'Universities', href: '/admin/universities', section: 'Ecosystem' },
            { icon: Building2, label: 'Institutions', href: '/admin/institutions', section: 'Ecosystem' },
            { icon: Store, label: 'Connect Reviews', href: '/admin/connect', section: 'Ecosystem' },
            { icon: UploadCloud, label: 'Excel Uploader', href: '/admin/excel-uploader', section: 'Ecosystem' },

            { header: 'HIERARCHY FORGE' },
            { icon: Network, label: 'Hierarchy Manager', href: '/admin/hierarchy-manager', section: 'Hierarchy' },
            { icon: FileText, label: 'Paper Generation', href: '/admin/paper-generation', section: 'Hierarchy' },
            { icon: FileText, label: 'Content Editor', href: '/admin/content-editor', section: 'Hierarchy' },
            { icon: BookOpen, label: 'Content Library', href: '/admin/content-library', section: 'Hierarchy' },
            { icon: TargetIcon, label: 'Question Bank', href: '/admin/question-bank', section: 'Hierarchy' },
            { icon: Globe2, label: 'Global Exam QB', href: '/admin/test-section-question-bank', section: 'Hierarchy' },
            { icon: University, label: 'Uni Question Bank', href: '/admin/uni-question-bank', section: 'Hierarchy' },
            { icon: FolderTree, label: 'Global Exam Mapper', href: '/admin/test-section-mapper', section: 'Hierarchy' },
            { icon: FolderTree, label: 'Uni. Content Mapper', href: '/admin/university-mapper', section: 'Hierarchy' },

            { header: 'ACCOUNT' },
            { icon: Users, label: 'Manage Users', href: '/admin/users', section: 'Account' },
            { icon: UserRound, label: 'Profile', href: '/admin/profile', section: 'Account' },
            { icon: Settings, label: 'Settings', href: '/admin/settings', section: 'Account' },
            { icon: MessageSquare, label: 'Feedback', href: '/admin/feedbacks', section: 'Account' },
            { icon: Flag, label: 'Reported Qs', href: '/admin/reported-questions', section: 'Account' },
        ];

        const institutionItems = [
            { icon: LayoutDashboard, label: 'Dashboard', href: '/institution-admin', section: 'Main' },
            { icon: Users, label: 'Manage Students', href: '/institution-admin/students', section: 'Main' },
            { icon: Building2, label: 'University Management', href: '/institution-admin/universities', section: 'Main' },
            { icon: FileText, label: 'Content Library', href: '/institution-admin/content-editor', section: 'Main' },
            { icon: TargetIcon, label: 'Assigned Tasks', href: '/institution-admin/assignments', section: 'Main' },
            { icon: ClipboardList, label: 'Task Reports', href: '/institution-admin/assignments/reports', section: 'Main' },
            { icon: Bell, label: 'Notifications', href: '/institution-admin/notifications', section: 'Main' },
            { icon: CalendarDays, label: 'Academic Calendar', href: '/institution-admin/calendar', section: 'Main' },
            { icon: TrendingUp, label: 'Analytics', href: '/institution-admin/analytics', section: 'Main' },
            { icon: UserRound, label: 'Profile', href: '/institution-admin/profile', section: 'Main' },
        ];

        if (userRole === 'super_admin') return adminItems;
        if (userRole === 'institution_admin') return institutionItems;
        
        // Default to student items for safety
        return studentItems.filter(item => {
            if (item.label === 'Assigned Tasks' && !currentUser?.institution_id) {
                return false;
            }
            return true;
        });
    };

    const navItems = getNavItems();
    const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
    const effectiveCollapsed = isSidebarCollapsed && !isMobile;

    // Color Palette Constants
    const deepOlive = '#1A2517';
    const softSage = '#ACC8A2';



    return (
        <>
            {/* Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            <aside
                onMouseEnter={() => !isSuperAdmin && setSidebarCollapsed(false)}
                onMouseLeave={() => !isSuperAdmin && setSidebarCollapsed(true)}
                className={`fixed top-[calc(env(safe-area-inset-top)+1rem)] bottom-[calc(env(safe-area-inset-bottom)+1rem)] lg:top-4 lg:bottom-4 flex flex-col z-[70] transition-all duration-300 transform
                ${isSidebarOpen
                        ? 'left-4 translate-x-0'
                        : '-translate-x-full left-0 lg:left-4 lg:translate-x-0'
                    }
                bg-white border-slate-200/80
                ${effectiveCollapsed ? 'w-20' : 'w-72'}
                rounded-[1.5rem] shadow-2xl border
            `}>
                <div className={`h-20 flex items-center overflow-hidden transition-all duration-300 ${effectiveCollapsed ? 'justify-center px-0' : 'px-4'}`}>
                    <Link
                        href={userRole === 'super_admin' ? "/admin/dashboard" : userRole === 'institution_admin' ? "/institution-admin" : "/dashboard"}
                        className={`flex items-center transition-all duration-300 ${effectiveCollapsed ? 'justify-center w-full' : 'gap-3'}`}
                        onClick={closeSidebar}
                    >
                        <div className="w-10 h-10 min-w-[40px] rounded-xl flex items-center justify-center bg-teal-600 text-white shrink-0 shadow-lg shadow-teal-100">
                            <GraduationCap className="w-5 h-5 text-white" />
                        </div>
                        <div className={`
                            flex flex-col transition-all duration-300 ease-in-out
                            ${effectiveCollapsed ? 'opacity-0 max-w-0 translate-x-4 pointer-events-none' : 'opacity-100 max-w-xs translate-x-0 ml-2'}
                        `}>
                            <span className="text-lg font-black block leading-tight text-slate-800 whitespace-nowrap tracking-tight">
                                Aptivo
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 whitespace-nowrap">
                                {userRole === 'super_admin' ? 'Portal Admin' : userRole === 'institution_admin' ? 'Institution' : 'Student Portal'}
                            </span>
                        </div>
                    </Link>
                </div>



                <nav ref={navRef} className={`flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar transition-all duration-300 ${effectiveCollapsed ? 'p-2' : 'p-3'}`}>
                    <div className="space-y-2">
                        {navItems.map((item: any, i) => {
                            if (item.header) {
                                return !effectiveCollapsed && (
                                    <div key={i} className="px-4 mt-8 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                        {item.header}
                                    </div>
                                );
                            }

                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    title={effectiveCollapsed ? item.label : ''}
                                    onClick={() => closeSidebar()}
                                    {...(item.tourId ? { 'data-tour': item.tourId } : {})}
                                    className={`
                                        flex items-center transition-all duration-300 group w-full py-3 rounded-2xl
                                        ${effectiveCollapsed ? 'justify-center px-0' : 'pl-4 pr-3'}
                                        ${active
                                            ? 'bg-teal-600 text-white shadow-xl shadow-teal-100'
                                            : 'text-slate-700 hover:bg-slate-50 hover:text-teal-600'
                                        }
                                    `}
                                >
                                    <div className="w-10 flex items-center justify-center shrink-0">
                                        <Icon className="h-[21px] w-[21px] stroke-[2.25] transition-transform duration-200 group-hover:scale-105" />
                                    </div>
                                    <span className={`
                                        text-sm font-bold whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden
                                        ${effectiveCollapsed ? 'max-w-0 opacity-0 ml-0 invisible translate-x-4' : 'max-w-xs opacity-100 ml-3 visible translate-x-0'}
                                    `}>
                                        {item.label}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className="p-3">
                    <button
                        onClick={handleLogout}
                        title={effectiveCollapsed ? "Logout" : ""}
                        className={`
                            flex items-center transition-all duration-300 w-full group py-3 rounded-2xl text-slate-500 hover:bg-red-50 hover:text-red-600
                            ${effectiveCollapsed ? 'justify-center px-0' : 'pl-4 pr-3'}
                        `}
                    >
                        <div className="w-10 flex items-center justify-center shrink-0">
                            <LogOut className="h-[21px] w-[21px] stroke-[2.25] transition-transform duration-200 group-hover:scale-105" />
                        </div>
                        <span className={`
                            text-sm font-bold whitespace-nowrap transition-all duration-300 ease-in-out overflow-hidden
                            ${effectiveCollapsed ? 'max-w-0 opacity-0 ml-0 invisible translate-x-4' : 'max-w-xs opacity-100 ml-3 visible translate-x-0'}
                        `}>
                            Logout
                        </span>
                    </button>
                </div>
            </aside >
            {userRole === 'student' && <MobileBottomNav />}
        </>
    );
};

export default Sidebar;
