'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Button, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import {
    UserOutlined,
    LogoutOutlined,
    BellOutlined,
    DashboardOutlined,
    TeamOutlined,
    FormOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    SettingOutlined,
    ApartmentOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { hasRole, hasAnyRole } from '../lib/auth';

const { Header, Sider, Content } = Layout;

interface DashboardLayoutProps {
    children: React.ReactNode;
    selectedKey?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, selectedKey = '1' }) => {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [collapsed, setCollapsed] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [notificationCount, setNotificationCount] = useState(0);

    useEffect(() => {
        // Load notifications
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/notifications', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setNotifications(data.data || []);
                    setNotificationCount(data.data?.filter((n: any) => !n.is_read).length || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const handleMenuClick = (key: string) => {
        // Navigation logic here
        switch (key) {
            case 'dashboard':
                router.push('/dashboard');
                break;
            case 'students':
                router.push('/dashboard/students');
                break;
            case 'profile':
                router.push('/dashboard/profile');
                break;
            case 'applications':
                router.push('/dashboard/applications');
                break;
            case 'staff-register':
                router.push('/dashboard/staff-register');
                break;
            case 'internship':
                router.push('/dashboard/internship');
                break;
            case 'hours':
                router.push('/dashboard/hours');
                break;
            case 'pending-reviews':
                router.push('/dashboard/pending-reviews');
                break;
            case 'all-applications':
                router.push('/dashboard/all-applications');
                break;
            case 'units':
                router.push('/dashboard/units');
                break;
            case 'my-unit':
                router.push('/dashboard/my-unit');
                break;
            case 'unit-applications':
                router.push('/dashboard/unit-applications');
                break;
            case 'reports':
                router.push('/dashboard/reports');
                break;
            case 'user-management':
                router.push('/dashboard/user-management');
                break;
            case 'system-config':
                router.push('/dashboard/system-config');
                break;
            case 'audit-logs':
                router.push('/dashboard/audit-logs');
                break;
            default:
                console.log('Navigate to:', key);
        }
    };

    const getMenuItems = () => {
        if (!user?.role) return [
            {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
            }
        ];

        // Define all possible menu items with their required permissions
        const allMenuItems = [
            {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
                roles: [UserRole.STUDENT, UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN]
            },
            // Student specific menus
            {
                key: 'profile',
                icon: <UserOutlined />,
                label: 'Hồ sơ cá nhân',
                roles: [UserRole.STUDENT]
            },
            {
                key: 'applications',
                icon: <FormOutlined />,
                label: 'Đơn đăng ký thực tập',
                roles: [UserRole.STUDENT]
            },
            {
                key: 'internship',
                icon: <ClockCircleOutlined />,
                label: 'Thực tập hiện tại',
                roles: [UserRole.STUDENT]
            },
            {
                key: 'hours',
                icon: <ClockCircleOutlined />,
                label: 'Bảng giờ thực tập',
                roles: [UserRole.STUDENT]
            },
            // L1 specific menus
            {
                key: 'pending-reviews',
                icon: <FileTextOutlined />,
                label: 'Duyệt đơn sơ bộ',
                roles: [UserRole.L1]
            },
            // Shared menus for multiple roles
            {
                key: 'staff-register',
                icon: <FormOutlined />,
                label: 'Đăng ký cho sinh viên',
                roles: [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN]
            },
            {
                key: 'all-applications',
                icon: <FormOutlined />,
                label: 'Tất cả đơn đăng ký',
                roles: [UserRole.L1, UserRole.SUPERVISOR, UserRole.ADMIN]
            },
            {
                key: 'students',
                icon: <TeamOutlined />,
                label: 'Danh sách sinh viên',
                roles: [UserRole.L1]
            },
            {
                key: 'units',
                icon: <ApartmentOutlined />,
                label: 'Đơn vị thực tập',
                roles: [UserRole.L1, UserRole.ADMIN]
            },
            {
                key: 'reports',
                icon: <FileTextOutlined />,
                label: 'Báo cáo',
                roles: [UserRole.L1]
            },
            // L2 specific menus
            {
                key: 'unit-applications',
                icon: <FormOutlined />,
                label: 'Duyệt thực tập đơn vị',
                roles: [UserRole.L2]
            },
            {
                key: 'my-unit',
                icon: <ApartmentOutlined />,
                label: 'Đơn vị của tôi',
                roles: [UserRole.L2]
            },
            {
                key: 'unit-students',
                icon: <TeamOutlined />,
                label: 'SV thực tập tại đơn vị',
                roles: [UserRole.L2]
            },
            {
                key: 'unit-hours',
                icon: <ClockCircleOutlined />,
                label: 'Quản lý giờ đơn vị',
                roles: [UserRole.L2]
            },
            {
                key: 'termination-requests',
                icon: <FileTextOutlined />,
                label: 'Yêu cầu chấm dứt',
                roles: [UserRole.L2]
            },
            // SUPERVISOR specific menus
            {
                key: 'overview',
                icon: <FileTextOutlined />,
                label: 'Tổng quan hệ thống',
                roles: [UserRole.SUPERVISOR]
            },
            {
                key: 'all-data',
                icon: <TeamOutlined />,
                label: 'Toàn bộ dữ liệu',
                roles: [UserRole.SUPERVISOR]
            },
            // Admin/Management menus
            {
                key: 'user-management',
                icon: <TeamOutlined />,
                label: 'Quản lý người dùng',
                roles: [UserRole.L1, UserRole.ADMIN]
            },
            {
                key: 'system-config',
                icon: <SettingOutlined />,
                label: 'Cấu hình hệ thống',
                roles: [UserRole.L1, UserRole.ADMIN]
            },
            {
                key: 'audit-logs',
                icon: <FileTextOutlined />,
                label: 'Nhật ký hệ thống',
                roles: [UserRole.L1, UserRole.SUPERVISOR, UserRole.ADMIN]
            }
        ];

        // Filter menu items based on user's roles
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        const accessibleMenuItems = allMenuItems.filter(item =>
            item.roles.some(role => userRoles.includes(role))
        );

        // Convert to Ant Design menu format (remove roles property)
        return accessibleMenuItems.map(({ roles, ...item }) => item);
    };

    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: 'Thông tin cá nhân',
        },
        {
            type: 'divider' as const,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Đăng xuất',
            onClick: logout,
        },
    ];

    const notificationMenuItems = notifications.slice(0, 5).map((notification, index) => ({
        key: `notification-${index}`,
        label: (
            <div style={{ maxWidth: 250, whiteSpace: 'normal' }}>
                <div style={{ fontWeight: notification.is_read ? 'normal' : 'bold' }}>
                    {notification.title}
                </div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                    {notification.body}
                </div>
            </div>
        ),
    }));

    const getRoleDisplayName = (role: UserRole | UserRole[]) => {
        const getSingleRoleDisplayName = (singleRole: UserRole) => {
            switch (singleRole) {
                case UserRole.STUDENT: return 'Sinh viên';
                case UserRole.L1: return 'CBQL Cấp khoa';
                case UserRole.L2: return 'CBQL Cấp phòng';
                case UserRole.SUPERVISOR: return 'Cán bộ giám sát';
                case UserRole.ADMIN: return 'Quản trị viên';
                default: return singleRole;
            }
        };

        if (Array.isArray(role)) {
            return role.map(getSingleRoleDisplayName).join(', ');
        }
        return getSingleRoleDisplayName(role);
    };

    if (!user) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" />
            </div>
        );
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
                <div style={{
                    height: 32,
                    margin: 16,
                    color: 'white',
                    textAlign: 'center',
                    fontSize: collapsed ? '12px' : '16px',
                    fontWeight: 'bold'
                }}>
                    {collapsed ? 'QLT' : 'Quản lý thực tập'}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[selectedKey]}
                    items={getMenuItems()}
                    onClick={({ key }) => handleMenuClick(key)}
                />
            </Sider>

            <Layout>
                <Header style={{
                    padding: '0 24px',
                    background: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                        Hệ thống quản lý thực tập
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Dropdown menu={{ items: notificationMenuItems }} placement="bottomRight">
                            <Badge count={notificationCount} size="small">
                                <Button
                                    type="text"
                                    icon={<BellOutlined />}
                                    style={{ fontSize: '16px' }}
                                />
                            </Badge>
                        </Dropdown>

                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                        {user.full_name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#999' }}>
                                        {getRoleDisplayName(user.role)}
                                    </div>
                                </div>
                            </div>
                        </Dropdown>
                    </div>
                </Header>

                <Content style={{
                    margin: '24px 16px',
                    padding: 24,
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                    {children}
                </Content>
            </Layout>
        </Layout>
    );
};

export default DashboardLayout;
