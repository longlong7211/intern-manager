'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AllApplications from '@/components/AllApplications';
import { UserRole } from '@/types';
import { hasAnyRole } from '@/lib/auth';

export default function DashboardAllApplicationsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<UserRole | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log('Dashboard - User data from API:', data);
                    const userRole = data.data.user.role;
                    console.log('Dashboard - User role:', userRole);
                    setUserRole(userRole);

                    // Check if user has permission to view all applications
                    // Only L1, SUPERVISOR and ADMIN can access this page
                    if (!hasAnyRole(userRole, [UserRole.L1, UserRole.SUPERVISOR, UserRole.ADMIN])) {
                        console.log('Dashboard - Access denied for role:', userRole);
                        router.push('/dashboard');
                        return;
                    }
                    console.log('Dashboard - Access granted for role:', userRole);
                } else {
                    localStorage.removeItem('token');
                    router.push('/login');
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                router.push('/login');
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, [router]);

    if (loading) {
        return (
            <DashboardLayout selectedKey="all-applications">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px'
                }}>
                    <div>Đang tải...</div>
                </div>
            </DashboardLayout>
        );
    }

    if (!userRole || !hasAnyRole(userRole, [UserRole.L1, UserRole.SUPERVISOR, UserRole.ADMIN])) {
        return (
            <DashboardLayout selectedKey="all-applications">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '400px'
                }}>
                    <div>Bạn không có quyền truy cập trang này</div>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <ProtectedRoute>
            <DashboardLayout selectedKey="all-applications">
                <AllApplications />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
