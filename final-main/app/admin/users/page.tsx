'use client';

import React, { useEffect, useState } from 'react';
import { Users, Search, MoreVertical, Shield, UserCheck, UserX, Mail, Trash2, Building2, ExternalLink, X, Save, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Footer from '@/components/shared/Footer';
import { AuthService } from '@/lib/services/authService';
// Supabase removed — using MongoDB API via fetch
// import { supabase } from '@/lib/supabase/client';
import { useUI } from '@/lib/context/UIContext';
import { useLoading } from '@/lib/context/LoadingContext';
import { getInitials } from '@/lib/utils';

export default function UserManagementPage() {
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const { setLoading: setGlobalLoading, isLoading: loading } = useLoading();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'student' | 'admin'>('all');
    const { isSidebarCollapsed } = useUI();
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [itemsPerPage] = useState(100);

    // Grouping / Expansion State
    const [expandedInstitutions, setExpandedInstitutions] = useState<Record<number, boolean>>({});

    const toggleInstitution = (instId: number) => {
        setExpandedInstitutions(prev => ({
            ...prev,
            [instId]: !prev[instId]
        }));
    };


    // Edit User State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editFormData, setEditFormData] = useState({ full_name: '', role: 'student' });

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setEditFormData({
            full_name: user.full_name || '',
            role: user.role || 'student'
        });
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            const response = await fetch('/api/mongo/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: editingUser.id,
                    full_name: editFormData.full_name,
                    role: editFormData.role
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update user');
            }

            loadUsers();
            setEditingUser(null);
        } catch (error: any) {
            alert(`Error updating user: ${error.message}`);
        }
    };

    useEffect(() => {
        const user = AuthService.getCurrentUser();
        if (!user || user.role === 'student') {
            window.location.href = '/dashboard';
            return;
        }
        setCurrentUser(user);
        fetchInstitutions();
    }, []);

    const loadUsers = async (page = 1, search = searchQuery, role = filterRole) => {
        setGlobalLoading(true, 'Acquiring User Database...');
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: itemsPerPage.toString(),
                q: search,
                role: role
            });
            const res = await fetch(`/api/mongo/admin/users?${queryParams}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch users');

            const data = await res.json();
            setUsers(data.users || []);
            setTotalPages(data.totalPages || 1);
            setTotalUsers(data.total || 0);
            setCurrentPage(data.page || 1);
        } catch (error) {
            console.error('Error loading users:', error);
            // Fallback for demo if API fails
            setUsers([
                { id: '1', full_name: 'Alex Chen', email: 'alex@demo.com', role: 'student', status: 'active', created_at: new Date().toISOString() },
                { id: '2', full_name: 'Sarah Jones', email: 'sarah@demo.com', role: 'student', status: 'active', created_at: new Date().toISOString() },
                { id: '3', full_name: 'Admin User', email: 'admin@aptivo.com', role: 'super_admin', status: 'active', created_at: new Date().toISOString() },
            ]);
        } finally {
            setGlobalLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers(1, searchQuery, filterRole);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, filterRole]);

    const handleApproveUser = async (userId: string, fullName: string) => {
        if (!confirm(`Approve institution admin account for ${fullName}? They will be able to log in immediately.`)) return;
        try {
            const response = await fetch('/api/mongo/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, status: 'active' })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to approve user');
            }
            loadUsers();
        } catch (error: any) {
            alert(`Error approving user: ${error.message}`);
        }
    };

    const filteredUsers = users; // Now handled server-side for pagination support

    const handleStatusToggle = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        try {
            const response = await fetch('/api/mongo/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    status: newStatus
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to update status');
            }
            loadUsers();
        } catch (error: any) {
            alert(`Error updating status: ${error.message}`);
        }
    };

    // Link User State
    const [linkingUser, setLinkingUser] = useState<any | null>(null);
    const [institutions, setInstitutions] = useState<any[]>([]);
    const [selectedInstId, setSelectedInstId] = useState<string>('');

    const fetchInstitutions = async () => {
        const res = await fetch('/api/mongo/admin/institutions');
        if (res.ok) {
            const data = await res.json();
            setInstitutions(data.institutions || []);
        }
    };

    // Create User State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createFormData, setCreateFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        role: 'student',
        institution_id: '',
        student_id: ''
    });

    const openCreateModal = () => {
        setCreateFormData({
            full_name: '',
            email: '',
            password: '',
            role: 'student',
            institution_id: '',
            student_id: ''
        });
        setIsCreateModalOpen(true);
        if (institutions.length === 0) fetchInstitutions();
    };

    const handleCreateUser = async () => {
        if (!createFormData.email || !createFormData.password || !createFormData.full_name) {
            alert('Please fill in all required fields');
            return;
        }

        setGlobalLoading(true, 'Creating User...');
        try {
            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: createFormData.email,
                    password: createFormData.password,
                    fullName: createFormData.full_name,
                    role: createFormData.role,
                    institutionId: createFormData.institution_id || null,
                    studentId: createFormData.student_id || null
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to create user');

            alert('User created successfully');
            setIsCreateModalOpen(false);
            loadUsers();
        } catch (error: any) {
            alert(`Error creating user: ${error.message}`);
        } finally {
            setGlobalLoading(false);
        }
    };


    const handleLinkToInstitution = async () => {
        if (!linkingUser || !selectedInstId) return;
        try {
            const response = await fetch('/api/mongo/admin/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: linkingUser.id,
                    institution_id: parseInt(selectedInstId)
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to link user');
            }

            alert('User successfully linked to institution');
            setLinkingUser(null);
            setSelectedInstId('');
            loadUsers();
        } catch (error: any) {
            alert(`Error linking user: ${error.message}`);
        }
    };

    const handleDeleteUser = async (userId: string, fullName: string) => {
        if (!confirm(`Are you sure you want to PERMANENTLY delete user ${fullName}? This will remove them from the database.`)) {
            return;
        }

        try {
            const response = await fetch('/api/delete-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to delete user');

            alert('User deleted successfully');
            loadUsers();
        } catch (error: any) {
            alert(`Error deleting user: ${error.message}`);
        }
    };

    if (loading) return null;

    return (
        <div className="min-h-screen bg-background flex font-sans">
            <Sidebar userRole={currentUser?.role || 'institution_admin'} />
            <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-28' : 'lg:ml-80'}`}>
                <Header
                    userName={currentUser?.full_name}
                    userEmail={currentUser?.email}
                />

                <main className="flex-1 pt-28 lg:pt-24 pb-12 px-4 sm:px-8">
                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
                            <p className="text-sm sm:text-base text-slate-500 mt-1 font-medium">Manage student access and administrative accounts</p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-slate-900 transition-all shadow-lg shadow-teal-100 active:scale-95"
                        >
                            <Users className="w-4 h-4" />
                            <span className="text-sm">Create User</span>
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="glass-surface p-4 mb-6 flex flex-col lg:flex-row gap-4 items-center justify-between animate-slide-in">
                        <div className="relative w-full lg:w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all text-sm font-medium"
                            />
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-xl w-full lg:w-fit overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterRole('all')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'all' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                All Users
                            </button>
                            <button
                                onClick={() => setFilterRole('student')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'student' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Students
                            </button>
                            <button
                                onClick={() => setFilterRole('admin')}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filterRole === 'admin' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                Admins
                            </button>
                            <button
                                onClick={() => setFilterRole('pending' as any)}
                                className={`flex-1 lg:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${(filterRole as any) === 'pending' ? 'bg-amber-50 shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                ⏳ Pending
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="glass-surface overflow-x-auto custom-scrollbar animate-slide-in" style={{ animationDelay: '0.1s' }}>
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Joined</th>
                                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic font-medium">
                                            No users found matching your filters
                                        </td>
                                    </tr>
                                ) : (
                                    (() => {
                                        // 1. Separate students and non-students
                                        const nonStudents = filteredUsers.filter(u => u.role !== 'student');
                                        const students = filteredUsers.filter(u => u.role === 'student');

                                        // 2. Separate solo students and institutional students
                                        // 1. Organize users into logical groups
                                        const superAdmins = filteredUsers.filter(u => u.role === 'super_admin');
                                        const institutionsMap: Record<number, { name: string, admins: any[], students: any[] }> = {};
                                        const soloStudents: any[] = [];
                                        const unlinkedAdmins: any[] = [];
                                        
                                        filteredUsers.forEach(u => {
                                            if (u.role === 'super_admin') return;
                                            
                                            // Initialize institution in map if it exists in state but not yet in map
                                            if (u.institution_id && u.institution && u.institution.status === 'approved') {
                                                if (!institutionsMap[u.institution_id]) {
                                                    institutionsMap[u.institution_id] = {
                                                        name: u.institution.name,
                                                        admins: [],
                                                        students: []
                                                    };
                                                }
                                                if (u.role === 'institution_admin') {
                                                    institutionsMap[u.institution_id].admins.push(u);
                                                } else {
                                                    institutionsMap[u.institution_id].students.push(u);
                                                }
                                            } else {
                                                if (u.role === 'student') soloStudents.push(u);
                                                else unlinkedAdmins.push(u);
                                            }
                                        });

                                        // Ensure all institutions from the institutions state are present if they are approved
                                        // This ensures all institutions show up even if they have no members on the current page
                                        institutions.forEach(inst => {
                                            if (inst.status === 'approved' && !institutionsMap[inst.id]) {
                                                institutionsMap[inst.id] = {
                                                    name: inst.name,
                                                    admins: [],
                                                    students: []
                                                };
                                            }
                                        });

                                        const rows: React.ReactNode[] = [];

                                        // Helper to render user row
                                        const renderUserRow = (user: any, depth = 0) => (
                                            <tr key={user.id} className={`hover:bg-teal-50/30 transition-colors group ${depth > 0 ? 'bg-slate-50/40' : ''}`}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center" style={{ paddingLeft: `${depth * 24}px` }}>
                                                        <div className="h-10 w-10 flex-shrink-0 relative">
                                                            <div className={`h-10 w-10 rounded-xl ${['super_admin', 'institution_admin'].includes(user.role) ? 'bg-slate-900' : 'bg-teal-600'} flex items-center justify-center text-white font-black text-sm shadow-md transition-transform group-hover:scale-110`}>
                                                                {getInitials(user.full_name || user.email)}
                                                            </div>
                                                            {depth > 0 && (
                                                                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-200" />
                                                            )}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                                                {user.full_name || 'Unknown'}
                                                                {user.role === 'student' && (
                                                                    <Link
                                                                        href={`/admin/analytics/student?id=${user.id}`}
                                                                        className="text-[10px] text-teal-600 hover:text-teal-700 font-black uppercase tracking-widest bg-teal-50 px-1.5 py-0.5 rounded"
                                                                    >
                                                                        Stats
                                                                    </Link>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {user.institution ? (
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                            <Building2 className="w-3.5 h-3.5 text-slate-300" />
                                                            {user.institution.name}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black uppercase text-slate-300 tracking-tighter italic">Personal</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${user.role === 'super_admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                                                        user.role === 'institution_admin' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                                            'bg-slate-50 text-slate-600 border border-slate-100'
                                                        }`}>
                                                        {user.role === 'super_admin' ? 'Super Admin' : user.role === 'institution_admin' ? 'Admin' : 'Student'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                                        user.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {user.status || 'Pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-[11px] font-bold text-slate-400">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => openEditModal(user)}
                                                            className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-teal-600 transition-all"
                                                            title="Edit User"
                                                        >
                                                            <UserCheck className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusToggle(user.id, user.status)}
                                                            className={`p-1.5 rounded transition-all ${user.status === 'suspended' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-slate-400 hover:bg-rose-50 hover:text-rose-500'}`}
                                                            title={user.status === 'suspended' ? "Activate Account" : "Suspend Account"}
                                                        >
                                                            {user.status === 'suspended' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                                            className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-all"
                                                            title="Delete Permanently"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );

                                        // 2. Render Super Admins
                                        if (superAdmins.length > 0) {
                                            rows.push(
                                                <tr key="super-admins-header" className="bg-slate-50 border-y border-slate-100">
                                                    <td colSpan={6} className="px-6 py-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Administrators</p>
                                                    </td>
                                                </tr>
                                            );
                                            superAdmins.forEach(u => rows.push(renderUserRow(u)));
                                        }

                                        // 3. Render Institutions
                                        Object.keys(institutionsMap).forEach(idStr => {
                                            const instId = parseInt(idStr);
                                            const group = institutionsMap[instId];
                                            const isExpanded = !!expandedInstitutions[instId];

                                            rows.push(
                                                <tr key={`inst-${instId}`} className="bg-slate-50 border-y border-slate-100">
                                                    <td colSpan={6} className="px-6 py-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-teal-600 shadow-sm">
                                                                    <Building2 className="w-4 h-4" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                                                                        {group.name}
                                                                        <span className="px-1.5 py-0.5 bg-teal-600 text-white rounded text-[8px] tracking-widest uppercase">
                                                                            {group.students.length + group.admins.length} Total
                                                                        </span>
                                                                    </p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                                        Institutional Group • {group.admins.length} Admins • {group.students.length} Students
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <button
                                                                onClick={() => toggleInstitution(instId)}
                                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isExpanded ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-600 hover:text-teal-600 shadow-sm'
                                                                    }`}
                                                            >
                                                                {isExpanded ? 'Hide Details' : 'View Members'}
                                                                <ArrowRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );

                                            if (isExpanded) {
                                                // Admins first, then students
                                                group.admins.forEach(a => rows.push(renderUserRow(a, 1)));
                                                group.students.forEach(s => rows.push(renderUserRow(s, 1)));
                                            }
                                        });

                                        // 4. Render Unlinked Admins
                                        if (unlinkedAdmins.length > 0) {
                                            rows.push(
                                                <tr key="unlinked-admins-header" className="bg-slate-50 border-y border-slate-100">
                                                    <td colSpan={6} className="px-6 py-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending / Unlinked Approvals</p>
                                                    </td>
                                                </tr>
                                            );
                                            unlinkedAdmins.forEach(u => rows.push(renderUserRow(u)));
                                        }

                                        // 5. Render Solo Students
                                        if (soloStudents.length > 0) {
                                            rows.push(
                                                <tr key="solo-students-header" className="bg-slate-50 border-y border-slate-100">
                                                    <td colSpan={6} className="px-6 py-2">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Standalone Students</p>
                                                    </td>
                                                </tr>
                                            );
                                            soloStudents.forEach(s => rows.push(renderUserRow(s)));
                                        }

                                        return rows;
                                    })()
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-400">
                                    Showing {users.length} of {totalUsers} users
                                </span>
                                <span className="text-[10px] text-slate-300 font-medium">
                                    Page {currentPage} of {totalPages}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => loadUsers(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:text-slate-300 disabled:bg-slate-50 transition-all hover:bg-slate-50"
                                >
                                    Previous
                                </button>
                                <button 
                                    onClick={() => loadUsers(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="px-4 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 disabled:text-slate-300 disabled:bg-slate-50 transition-all hover:bg-slate-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>

            {/* LINK MODAL */}
            {linkingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="text-xl font-bold text-slate-900">Link User to Institution</h3>
                            <p className="text-xs text-slate-500 mt-1 font-medium">Link {linkingUser.full_name || linkingUser.email}</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Select Institution</label>
                                <select
                                    value={selectedInstId}
                                    onChange={(e) => setSelectedInstId(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-medium text-slate-700"
                                >
                                    <option value="">Search or select...</option>
                                    {institutions.map(inst => (
                                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setLinkingUser(null)}
                                    className="flex-1 py-4 bg-gray-100 text-slate-700 font-bold rounded-2xl hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLinkToInstitution}
                                    disabled={!selectedInstId}
                                    className="flex-1 py-4 bg-teal-600 text-white font-bold rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
                                >
                                    Confirm Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT USER MODAL */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Edit User Details</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingUser.email}</p>
                            </div>
                            <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={editFormData.full_name}
                                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                                <select
                                    value={editFormData.role}
                                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none appearance-none"
                                >
                                    <option value="student">Student</option>
                                    <option value="institution_admin">Institution Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateUser}
                                    className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE USER MODAL */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Create New User</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Add a new account to the system</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Role</label>
                                    <select
                                        value={createFormData.role}
                                        onChange={(e) => setCreateFormData({ ...createFormData, role: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none appearance-none"
                                    >
                                        <option value="student">Student</option>
                                        <option value="institution_admin">Institution Admin</option>
                                        <option value="super_admin">Super Admin</option>
                                    </select>
                                </div>

                                {createFormData.role !== 'super_admin' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Institution</label>
                                        <select
                                            value={createFormData.institution_id}
                                            onChange={(e) => setCreateFormData({ ...createFormData, institution_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none appearance-none"
                                        >
                                            <option value="">Select Institution</option>
                                            {institutions.map(inst => (
                                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                                <input
                                    type="text"
                                    value={createFormData.full_name}
                                    onChange={(e) => setCreateFormData({ ...createFormData, full_name: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                <input
                                    type="email"
                                    value={createFormData.email}
                                    onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                    placeholder="e.g. john@example.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Password</label>
                                <input
                                    type="password"
                                    value={createFormData.password}
                                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                    placeholder="Minimum 6 characters"
                                />
                            </div>

                            {createFormData.role === 'student' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Student ID (Optional)</label>
                                    <input
                                        type="text"
                                        value={createFormData.student_id}
                                        onChange={(e) => setCreateFormData({ ...createFormData, student_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all outline-none"
                                        placeholder="e.g. ST-2024-001"
                                    />
                                </div>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateUser}
                                    className="flex-1 py-3.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Users className="w-4 h-4" />
                                    Create User
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
