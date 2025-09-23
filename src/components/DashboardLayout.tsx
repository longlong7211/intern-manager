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
        const baseItems = [
            {
                key: 'dashboard',
                icon: <DashboardOutlined />,
                label: 'Dashboard',
            }
        ];

        if (!user?.role) return baseItems;

        const menuItems = [...baseItems];

        // Student specific menus
        if (hasRole(user.role, UserRole.STUDENT)) {
            menuItems.push(
                {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: 'Hồ sơ cá nhân',
                },
                {
                    key: 'applications',
                    icon: <FormOutlined />,
                    label: 'Đơn đăng ký thực tập',
                },
                {
                    key: 'internship',
                    icon: <ClockCircleOutlined />,
                    label: 'Thực tập hiện tại',
                },
                {
                    key: 'hours',
                    icon: <ClockCircleOutlined />,
                    label: 'Bảng giờ thực tập',
                }
            );
        }

        // L1 specific menus
        if (hasRole(user.role, UserRole.L1)) {
            menuItems.push(
                {
                    key: 'pending-reviews',
                    icon: <FileTextOutlined />,
                    label: 'Duyệt đơn sơ bộ',
                },
                {
                    key: 'staff-register',
                    icon: <FormOutlined />,
                    label: 'Đăng ký cho sinh viên',
                },
                {
                    key: 'all-applications',
                    icon: <FormOutlined />,
                    label: 'Tất cả đơn đăng ký',
                },
                {
                    key: 'students',
                    icon: <TeamOutlined />,
                    label: 'Danh sách sinh viên',
                },
                {
                    key: 'units',
                    icon: <ApartmentOutlined />,
                    label: 'Đơn vị thực tập',
                },
                {
                    key: 'reports',
                    icon: <FileTextOutlined />,
                    label: 'Báo cáo',
                },
                // Admin privileges for L1
                {
                    key: 'user-management',
                    icon: <TeamOutlined />,
                    label: 'Quản lý người dùng',
                },
                {
                    key: 'system-config',
                    icon: <SettingOutlined />,
                    label: 'Cấu hình hệ thống',
                },
                {
                    key: 'audit-logs',
                    icon: <FileTextOutlined />,
                    label: 'Nhật ký hệ thống',
                }
            );
        }

        // L2 specific menus  
        if (hasRole(user.role, UserRole.L2)) {
            menuItems.push(
                {
                    key: 'unit-applications',
                    icon: <FormOutlined />,
                    label: 'Chấp nhận thực tập',
                },
                {
                    key: 'staff-register',
                    icon: <FormOutlined />,
                    label: 'Đăng ký cho sinh viên',
                },
                {
                    key: 'my-unit',
                    icon: <ApartmentOutlined />,
                    label: 'Đơn vị của tôi',
                },
                {
                    key: 'unit-students',
                    icon: <TeamOutlined />,
                    label: 'SV thực tập tại đơn vị',
                },
                {
                    key: 'unit-hours',
                    icon: <ClockCircleOutlined />,
                    label: 'Quản lý giờ đơn vị',
                },
                {
                    key: 'termination-requests',
                    icon: <FileTextOutlined />,
                    label: 'Yêu cầu chấm dứt',
                }
            );
        }

        // SUPERVISOR specific menus
        if (hasRole(user.role, UserRole.SUPERVISOR)) {
            menuItems.push(
                {
                    key: 'overview',
                    icon: <FileTextOutlined />,
                    label: 'Tổng quan hệ thống',
                },
                {
                    key: 'staff-register',
                    icon: <FormOutlined />,
                    label: 'Đăng ký cho sinh viên',
                },
                {
                    key: 'all-applications',
                    icon: <FormOutlined />,
                    label: 'Tất cả đơn đăng ký',
                },
                {
                    key: 'all-data',
                    icon: <TeamOutlined />,
                    label: 'Toàn bộ dữ liệu',
                },
                {
                    key: 'audit-logs',
                    icon: <FileTextOutlined />,
                    label: 'Nhật ký hệ thống',
                }
            );
        }

        // ADMIN specific menus
        if (hasRole(user.role, UserRole.ADMIN)) {
            menuItems.push(
                {
                    key: 'user-management',
                    icon: <TeamOutlined />,
                    label: 'Quản lý người dùng',
                },
                {
                    key: 'staff-register',
                    icon: <FormOutlined />,
                    label: 'Đăng ký cho sinh viên',
                },
                {
                    key: 'all-applications',
                    icon: <FormOutlined />,
                    label: 'Tất cả đơn đăng ký',
                },
                {
                    key: 'units',
                    icon: <ApartmentOutlined />,
                    label: 'Đơn vị thực tập',
                },
                {
                    key: 'system-config',
                    icon: <SettingOutlined />,
                    label: 'Cấu hình hệ thống',
                },
                {
                    key: 'audit-logs',
                    icon: <FileTextOutlined />,
                    label: 'Nhật ký hệ thống',
                }
            );
        }

        return menuItems;
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
