'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserManagement from '../../../components/UserManagement';

export default function UserManagementPage() {
    return (
        <ProtectedRoute>
            <DashboardLayout selectedKey="user-management">
                <UserManagement />
            </DashboardLayout>
        </ProtectedRoute>
    );
}
