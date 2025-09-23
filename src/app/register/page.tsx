'use client';

import InternshipApplication from '@/components/InternshipApplication';
import { Layout } from 'antd';

const { Content } = Layout;

export default function RegisterPage() {
    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            <Content style={{ padding: '24px' }}>
                <InternshipApplication />
            </Content>
        </Layout>
    );
}
