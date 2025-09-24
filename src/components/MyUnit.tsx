'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, Descriptions, Button, Form, Input, Switch, Modal, Spin, Tag, Row, Col, Statistic, Table } from 'antd';
import { EditOutlined, TeamOutlined, FileTextOutlined, ClockCircleOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../hooks/useNotification';
import { UserRole } from '../types';

const { TextArea } = Input;

interface Unit {
    _id: string;
    name: string;
    address?: string;
    contact_person?: string;
    contact_email?: string;
    contact_phone?: string;
    description?: string;
    is_active: boolean;
    managers?: Array<{
        _id: string;
        full_name: string;
        email: string;
        username?: string;
        role: string | string[];
    }>;
    created_at: string;
    updated_at: string;
}

interface UnitStats {
    totalApplications: number;
    pendingApplications: number;
    activeInterns: number;
    completedInternships: number;
}

const MyUnit: React.FC = () => {
    const { user, token } = useAuth();
    const { notification, contextHolder } = useNotification();

    // Helper function to format dates consistently
    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toISOString().split('T')[0].split('-').reverse().join('/');
        } catch {
            return 'Không xác định';
        }
    };
    const [unit, setUnit] = useState<Unit | null>(null);
    const [stats, setStats] = useState<UnitStats>({
        totalApplications: 0,
        pendingApplications: 0,
        activeInterns: 0,
        completedInternships: 0
    });
    const [loading, setLoading] = useState(true);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [form] = Form.useForm();
    const hasFetchedRef = useRef(false);

    const fetchUnitData = async () => {
        console.log('fetchUnitData called', {
            token: !!token,
            user_unit_id: user?.unit_id,
            user_unitId: (user as any)?.unitId,
            user_role: user?.role,
            full_user: user
        });

        if (!token) {
            console.log('Missing token');
            setLoading(false);
            return;
        }

        if (!user) {
            console.log('User not loaded yet');
            setLoading(false);
            return;
        }

        // Check if user has L2 role
        const userRoles = Array.isArray(user.role) ? user.role : [user.role];
        const isL2User = userRoles.includes(UserRole.L2);

        if (!isL2User) {
            console.log('User is not L2, roles:', userRoles);
            setLoading(false);
            return;
        }

        // Handle both unit_id and unitId fields (API inconsistency)
        const unitId = (user as any).unitId || user.unit_id;

        if (!unitId) {
            console.log('L2 user missing unit_id', { user_id: user._id, roles: userRoles, unitId, unit_id: user.unit_id });
            notification.error({
                message: 'Lỗi cấu hình',
                description: 'Tài khoản L2 chưa được gán vào đơn vị nào. Vui lòng liên hệ quản trị viên.'
            });
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            console.log(`Fetching unit data for unit_id: ${unitId}`);

            // Fetch unit details
            const unitResponse = await fetch(`/api/units/${unitId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Unit response status:', unitResponse.status);

            let unitData = null;
            if (unitResponse.ok) {
                unitData = await unitResponse.json();
                console.log('Unit data received:', unitData);

                // Fetch unit managers (L2 users belonging to this unit)
                try {
                    const managersResponse = await fetch(`/api/users?role=L2&unit_id=${unitId}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    });

                    if (managersResponse.ok) {
                        const managersData = await managersResponse.json();
                        console.log('Unit managers received:', managersData);

                        // Filter to ensure only L2 users are included
                        const l2Managers = (managersData.data || []).filter((manager: any) => {
                            const roles = Array.isArray(manager.role) ? manager.role : [manager.role];
                            return roles.includes('L2');
                        });

                        console.log('Filtered L2 managers:', l2Managers);

                        // Set unit data with L2 managers only
                        setUnit({
                            ...unitData.data,
                            managers: l2Managers
                        });
                    } else {
                        // Set unit data without managers if can't fetch them
                        setUnit(unitData.data);
                    }
                } catch (error) {
                    console.warn('Could not fetch unit managers:', error);
                    // Set unit data without managers if error occurs
                    setUnit(unitData.data);
                }
            } else {
                const errorData = await unitResponse.json();
                console.error('Failed to fetch unit:', errorData);
                notification.error({
                    message: 'Lỗi',
                    description: errorData.message || 'Không thể tải thông tin đơn vị'
                });
            }

            // Fetch unit statistics (you may need to create these endpoints)
            // For now, using placeholder data
            setStats({
                totalApplications: 0,
                pendingApplications: 0,
                activeInterns: 0,
                completedInternships: 0
            });

        } catch (error) {
            console.error('Error fetching unit data:', error);
            notification.error({
                message: 'Lỗi',
                description: 'Không thể tải thông tin đơn vị'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && token && user && !hasFetchedRef.current) {
            fetchUnitData();
            hasFetchedRef.current = true;
        }
    }, [mounted, token, user]);

    // Prevent hydration issues by not rendering until mounted
    if (!mounted) {
        return null;
    }

    const handleEdit = () => {
        if (unit) {
            form.setFieldsValue({
                name: unit.name,
                address: unit.address,
                contact_person: unit.contact_person,
                contact_email: unit.contact_email,
                contact_phone: unit.contact_phone,
                description: unit.description,
                is_active: unit.is_active
            });
            setEditModalVisible(true);
        }
    };

    const handleSave = async (values: any) => {
        if (!token || !unit) return;

        try {
            setSaving(true);

            const response = await fetch(`/api/units/${unit._id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });

            if (response.ok) {
                notification.success({
                    message: 'Thành công',
                    description: 'Đã cập nhật thông tin đơn vị'
                });
                setEditModalVisible(false);
                hasFetchedRef.current = false;
                fetchUnitData();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            console.error('Error updating unit:', error);
            notification.error({
                message: 'Lỗi',
                description: (error as Error).message || 'Không thể cập nhật thông tin đơn vị'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                <Spin size="large" tip="Đang tải thông tin đơn vị...">
                    <div style={{ width: '200px', height: '100px' }} />
                </Spin>
            </div>
        );
    }

    if (!unit) {
        // Check user status for better error messages
        const userRoles = user ? (Array.isArray(user.role) ? user.role : [user.role]) : [];
        const isL2User = userRoles.includes(UserRole.L2);

        let errorMessage = 'Không tìm thấy thông tin đơn vị';
        let errorDescription = 'Bạn chưa được gán vào đơn vị nào hoặc đơn vị không tồn tại.';

        if (!user) {
            errorMessage = 'Chưa tải được thông tin người dùng';
            errorDescription = 'Vui lòng đăng nhập lại.';
        } else if (!isL2User) {
            errorMessage = 'Không có quyền truy cập';
            errorDescription = 'Chỉ có cán bộ quản lý cấp đơn vị (L2) mới có thể truy cập trang này.';
        } else if (!((user as any).unitId || user.unit_id)) {
            errorMessage = 'Chưa được gán đơn vị';
            errorDescription = 'Tài khoản của bạn chưa được gán vào đơn vị nào. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
        }

        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <FileTextOutlined style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
                    <h3>{errorMessage}</h3>
                    <p style={{ color: '#666' }}>
                        {errorDescription}
                    </p>
                    {isL2User && ((user as any)?.unitId || user?.unit_id) && (
                        <Button type="primary" icon={<ReloadOutlined />} onClick={() => {
                            hasFetchedRef.current = false;
                            fetchUnitData();
                        }}>
                            Tải lại
                        </Button>
                    )}
                    <Button
                        style={{ marginLeft: 8 }}
                        onClick={() => console.log('Debug info:', {
                            user,
                            token: !!token,
                            hasUnitId: !!((user as any)?.unitId || user?.unit_id),
                            userRoles,
                            isL2User
                        })}
                    >
                        Debug
                    </Button>
                </div>
            </Card>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            {contextHolder}

            {/* Unit Statistics */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Tổng số đơn"
                            value={stats.totalApplications}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#1890ff' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Đơn chờ duyệt"
                            value={stats.pendingApplications}
                            prefix={<ClockCircleOutlined />}
                            valueStyle={{ color: '#faad14' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="SV đang thực tập"
                            value={stats.activeInterns}
                            prefix={<TeamOutlined />}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card>
                        <Statistic
                            title="Thực tập hoàn thành"
                            value={stats.completedInternships}
                            prefix={<FileTextOutlined />}
                            valueStyle={{ color: '#722ed1' }}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Unit Information */}
            <Card
                title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>🏢 Thông tin đơn vị</span>
                        <Button
                            type="primary"
                            icon={<EditOutlined />}
                            onClick={handleEdit}
                        >
                            Chỉnh sửa
                        </Button>
                    </div>
                }
                style={{ marginBottom: 24 }}
            >
                <Descriptions bordered column={2}>
                    <Descriptions.Item label="Tên đơn vị" span={2}>
                        <strong style={{ fontSize: '16px' }}>{unit.name}</strong>
                    </Descriptions.Item>

                    <Descriptions.Item label="Trạng thái">
                        <Tag color={unit.is_active ? 'green' : 'red'}>
                            {unit.is_active ? 'Hoạt động' : 'Ngừng hoạt động'}
                        </Tag>
                    </Descriptions.Item>

                    <Descriptions.Item label="Người liên hệ">
                        {unit.contact_person || 'Chưa cập nhật'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Email liên hệ">
                        {unit.contact_email || 'Chưa cập nhật'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Số điện thoại">
                        {unit.contact_phone || 'Chưa cập nhật'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Địa chỉ" span={2}>
                        {unit.address || 'Chưa cập nhật'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Mô tả" span={2}>
                        {unit.description || 'Chưa có mô tả'}
                    </Descriptions.Item>

                    <Descriptions.Item label="Quản lý đơn vị (L2)" span={2}>
                        {unit.managers && unit.managers.length > 0 ? (
                            <div>
                                {unit.managers
                                    .filter(manager => {
                                        // Chỉ hiển thị những user có role L2
                                        const roles = Array.isArray(manager.role) ? manager.role : [manager.role];
                                        return roles.includes('L2');
                                    })
                                    .map(manager => {
                                        const roles = Array.isArray(manager.role) ? manager.role : [manager.role];

                                        return (
                                            <Tag
                                                key={manager._id}
                                                color="blue"
                                                style={{
                                                    marginBottom: 8,
                                                    marginRight: 8,
                                                    padding: '4px 8px',
                                                    display: 'inline-block',
                                                    minWidth: '200px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontSize: '14px' }}>
                                                        👤 {manager.full_name}
                                                    </span>
                                                    <Tag color="green" style={{ fontSize: '10px' }}>
                                                        {roles.join(', ')}
                                                    </Tag>
                                                </div>
                                                <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                                                    📧 {manager.email}
                                                    {manager.username && (
                                                        <span style={{ marginLeft: '8px' }}>
                                                            👥 {manager.username}
                                                        </span>
                                                    )}
                                                </div>
                                            </Tag>
                                        );
                                    })}

                                {/* Hiển thị thông báo nếu không có L2 manager nào sau khi filter */}
                                {unit.managers.filter(manager => {
                                    const roles = Array.isArray(manager.role) ? manager.role : [manager.role];
                                    return roles.includes('L2');
                                }).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <div style={{ fontSize: '16px', color: '#999', marginBottom: '8px' }}>
                                            🏢 Chưa có cán bộ L2 nào được gán vào đơn vị
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                            💡 Liên hệ quản trị viên để gán cán bộ có vai trò L2 làm quản lý đơn vị
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ marginTop: 12, fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                        ℹ️ Chỉ những cán bộ có vai trò L2 mới có quyền quản lý đơn vị này
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                <div style={{ fontSize: '16px', color: '#999', marginBottom: '8px' }}>
                                    🏢 Chưa có cán bộ L2 nào được gán vào đơn vị
                                </div>
                                <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                                    💡 Liên hệ quản trị viên để gán cán bộ có vai trò L2 làm quản lý đơn vị
                                </div>
                            </div>
                        )}
                    </Descriptions.Item>

                    <Descriptions.Item label="Ngày tạo">
                        {formatDate(unit.created_at)}
                    </Descriptions.Item>

                    <Descriptions.Item label="Cập nhật cuối">
                        {formatDate(unit.updated_at)}
                    </Descriptions.Item>
                </Descriptions>
            </Card>

            {/* Edit Unit Modal */}
            <Modal
                title="Chỉnh sửa thông tin đơn vị"
                open={editModalVisible}
                onCancel={() => setEditModalVisible(false)}
                footer={null}
                width={800}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSave}
                >
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                label="Tên đơn vị"
                                name="name"
                                rules={[
                                    { required: true, message: 'Vui lòng nhập tên đơn vị!' }
                                ]}
                            >
                                <Input placeholder="Nhập tên đơn vị" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Người liên hệ"
                                name="contact_person"
                            >
                                <Input placeholder="Tên người liên hệ" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Email liên hệ"
                                name="contact_email"
                                rules={[
                                    { type: 'email', message: 'Email không hợp lệ!' }
                                ]}
                            >
                                <Input placeholder="email@example.com" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Số điện thoại"
                                name="contact_phone"
                            >
                                <Input placeholder="Số điện thoại" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Trạng thái"
                                name="is_active"
                                valuePropName="checked"
                            >
                                <Switch
                                    checkedChildren="Hoạt động"
                                    unCheckedChildren="Ngừng"
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        label="Địa chỉ"
                        name="address"
                    >
                        <Input placeholder="Địa chỉ đơn vị" />
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description"
                    >
                        <TextArea
                            rows={4}
                            placeholder="Mô tả về đơn vị..."
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Button
                            style={{ marginRight: 8 }}
                            onClick={() => setEditModalVisible(false)}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={saving}
                            icon={<SaveOutlined />}
                        >
                            Lưu thay đổi
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MyUnit;
