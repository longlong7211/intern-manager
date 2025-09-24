'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading, token } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If not loading and no user/token, redirect to home
        if (!loading && (!user || !token)) {
            router.push('/');
        }
    }, [user, loading, token, router]);

    // Show loading while checking authentication
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <Spin size="large" />
            </div>
        );
    }

    // If no user or token, don't render children (will redirect)
    if (!user || !token) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
