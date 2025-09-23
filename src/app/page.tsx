'use client';

import { Spin } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import AuthComponent from '../components/AuthComponent';
import { useRouter } from 'next/navigation';

export default function Home() {
    const { user, loading } = useAuth();
    const router = useRouter();

    // If user is authenticated, redirect to dashboard
    if (user && !loading) {
        router.push('/dashboard');
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh'
            }}>
                <Spin size="large" />
                <span style={{ marginLeft: 16 }}>Đang chuyển đến dashboard...</span>
            </div>
        );
    }

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

    // If not authenticated, show login form
    if (!user) {
        return <AuthComponent />;
    }

    return null;
}