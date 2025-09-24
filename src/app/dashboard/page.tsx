'use client';

import React, { useState } from 'react';
import { Card, Tabs, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ProtectedRoute from '../../components/ProtectedRoute';
import StudentList from '../../components/StudentList';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';

const { TabPane } = Tabs;

const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('overview');

    const renderOverview = () => (
        <Row gutter={[16, 16]}>
            <Col span={6}>
                <Card>
                    <Statistic
                        title="Tổng sinh viên"
                        value={150}
                        prefix={<UserOutlined />}
                        valueStyle={{ color: '#3f8600' }}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card>
                    <Statistic
                        title="Đang thực tập"
                        value={85}
                        prefix={<TeamOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card>
                    <Statistic
                        title="Đơn chờ duyệt"
                        value={12}
                        prefix={<FileTextOutlined />}
                        valueStyle={{ color: '#faad14' }}
                    />
                </Card>
            </Col>
            <Col span={6}>
                <Card>
                    <Statistic
                        title="Tổng giờ thực tập"
                        value={12840}
                        prefix={<ClockCircleOutlined />}
                        valueStyle={{ color: '#722ed1' }}
                    />
                </Card>
            </Col>
        </Row>
    );

    const getTabItems = () => {
        const items = [
            {
                key: 'overview',
                label: 'Tổng quan',
                children: renderOverview()
            }
        ];

        // Thêm tab danh sách sinh viên cho các role có quyền
        if (user?.role === UserRole.L1 || user?.role === UserRole.L2 ||
            user?.role === UserRole.SUPERVISOR || user?.role === UserRole.ADMIN) {
            items.push({
                key: 'students',
                label: 'Danh sách sinh viên',
                children: <StudentList />
            });
        }

        return items;
    };

    return (
        <DashboardLayout selectedKey="dashboard">
            <div style={{ padding: '24px' }}>
                <h1 style={{ marginBottom: '24px' }}>
                    Dashboard - Quản lý thực tập sinh viên
                </h1>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={getTabItems()}
                />
            </div>
        </DashboardLayout>
    );
};

const ProtectedDashboard: React.FC = () => {
    return (
        <ProtectedRoute>
            <Dashboard />
        </ProtectedRoute>
    );
};

export default ProtectedDashboard;
