'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Switch, Space, Modal, Form, message, Spin, Tag, Select, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined, SearchOutlined, DeleteOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { hasAnyRole } from '../lib/auth';

const { TextArea } = Input;
const { Option } = Select;

interface Unit {
    _id: string;
    name: string;
    address: string;
    contact_person: string;
    contact_email: string;
    contact_phone: string;
    description?: string;
    is_active: boolean;
    managers?: Array<{
        _id: string;
        full_name: string;
        email: string;
        username?: string;
    }>;
    created_at: string;
    updated_at: string;
}

interface User {
    _id: string;
    full_name: string;
    email: string;
    username?: string;
    role: UserRole | UserRole[];
}

const UnitManagement: React.FC = () => {
    const { user } = useAuth();
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    const [form] = Form.useForm();

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/units', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setUnits(data.data || []);
                }
            } else {
                message.error('Không thể tải danh sách đơn vị');
            }
        } catch (error) {
            console.error('Error fetching units:', error);
            message.error('Lỗi khi tải danh sách đơn vị');
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableUsers = async (unitId?: string) => {
        try {
            const token = localStorage.getItem('token');
            // Lấy tất cả người dùng có thể làm manager
            const response = await fetch('/api/units/available-managers', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAvailableUsers(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const openModal = (unit?: Unit) => {
        setEditingUnit(unit || null);
        setModalVisible(true);
        fetchAvailableUsers(unit?._id);

        if (unit) {
            form.setFieldsValue({
                ...unit,
                managers: unit.managers?.map(m => m._id) || []
            });
        } else {
            form.resetFields();
            form.setFieldValue('is_active', true);
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            const token = localStorage.getItem('token');
            const url = editingUnit ? `/api/units/${editingUnit._id}` : '/api/units';
            const method = editingUnit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(values)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    message.success(editingUnit ? 'Cập nhật đơn vị thành công' : 'Thêm đơn vị thành công');
                    setModalVisible(false);
                    fetchUnits();
                } else {
                    message.error(data.message || 'Lỗi khi lưu đơn vị');
                }
            } else {
                message.error('Lỗi khi lưu đơn vị');
            }
        } catch (error) {
            console.error('Error saving unit:', error);
            message.error('Lỗi khi lưu đơn vị');
        }
    };

    const toggleUnitStatus = async (unitId: string, isActive: boolean) => {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/units/${unitId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ is_active: isActive })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    message.success(isActive ? 'Kích hoạt đơn vị thành công' : 'Vô hiệu hóa đơn vị thành công');
                    fetchUnits();
                } else {
                    message.error(data.message || 'Lỗi khi cập nhật trạng thái');
                }
            } else {
                message.error('Lỗi khi cập nhật trạng thái');
            }
        } catch (error) {
            console.error('Error updating unit status:', error);
            message.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const deleteUnit = async (unitId: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa đơn vị này? Hành động này không thể hoàn tác.',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    const token = localStorage.getItem('token');

                    const response = await fetch(`/api/units/${unitId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        if (data.success) {
                            message.success('Xóa đơn vị thành công');
                            fetchUnits();
                        } else {
                            message.error(data.message || 'Lỗi khi xóa đơn vị');
                        }
                    } else {
                        message.error('Lỗi khi xóa đơn vị');
                    }
                } catch (error) {
                    console.error('Error deleting unit:', error);
                    message.error('Lỗi khi xóa đơn vị');
                }
            }
        });
    };

    const viewUnitDetail = (unit: Unit) => {
        Modal.info({
            title: `Chi tiết đơn vị: ${unit.name}`,
            width: 600,
            content: (
                <div style={{ marginTop: 16 }}>
                    <p><strong>Tên đơn vị:</strong> {unit.name}</p>
                    <p><strong>Địa chỉ:</strong> {unit.address}</p>
                    <p><strong>Người liên hệ:</strong> {unit.contact_person}</p>
                    <p><strong>Email:</strong> {unit.contact_email}</p>
                    <p><strong>Số điện thoại:</strong> {unit.contact_phone}</p>
                    <p><strong>Người quản lý:</strong> {
                        unit.managers && unit.managers.length > 0
                            ? unit.managers.map(m => m.full_name).join(', ')
                            : 'Chưa có người quản lý'
                    }</p>
                    <p><strong>Mô tả:</strong> {unit.description || 'Không có mô tả'}</p>
                    <p><strong>Trạng thái:</strong>
                        <Tag color={unit.is_active ? 'green' : 'red'}>
                            {unit.is_active ? 'Đang hoạt động' : 'Không hoạt động'}
                        </Tag>
                    </p>
                    <p><strong>Ngày tạo:</strong> {new Date(unit.created_at).toLocaleString('vi-VN')}</p>
                    <p><strong>Cập nhật lần cuối:</strong> {new Date(unit.updated_at).toLocaleString('vi-VN')}</p>
                </div>
            ),
        });
    };

    const filteredUnits = units.filter(unit =>
        !searchText ||
        unit.name.toLowerCase().includes(searchText.toLowerCase()) ||
        unit.contact_person.toLowerCase().includes(searchText.toLowerCase()) ||
        unit.contact_email.toLowerCase().includes(searchText.toLowerCase())
    );

    const columns = [
        {
            title: 'Tên đơn vị',
            dataIndex: 'name',
            key: 'name',
            render: (text: string, record: Unit) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{text}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.contact_person}</div>
                </div>
            ),
        },
        {
            title: 'Liên hệ',
            key: 'contact',
            render: (record: Unit) => (
                <div>
                    <div>{record.contact_email}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.contact_phone}</div>
                </div>
            ),
        },
        {
            title: 'Người quản lý',
            key: 'managers',
            render: (record: Unit) => (
                <div>
                    {record.managers && record.managers.length > 0 ? (
                        record.managers.map(manager => (
                            <Tag key={manager._id} color="blue" style={{ marginBottom: 4 }}>
                                {manager.full_name}
                            </Tag>
                        ))
                    ) : (
                        <span style={{ color: '#999' }}>Chưa có người quản lý</span>
                    )}
                </div>
            ),
        },
        {
            title: 'Địa chỉ',
            dataIndex: 'address',
            key: 'address',
            ellipsis: true,
        },
        {
            title: 'Trạng thái',
            key: 'is_active',
            render: (record: Unit) => (
                <Switch
                    checked={record.is_active}
                    onChange={(checked) => toggleUnitStatus(record._id, checked)}
                    disabled={!user?.role || !hasAnyRole(user.role, [UserRole.ADMIN, UserRole.L1])}
                />
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (record: Unit) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => viewUnitDetail(record)}
                    >
                        Chi tiết
                    </Button>
                    {(user?.role && hasAnyRole(user.role, [UserRole.ADMIN, UserRole.L1])) && (
                        <>
                            <Button
                                icon={<EditOutlined />}
                                size="small"
                                onClick={() => openModal(record)}
                            >
                                Sửa
                            </Button>
                            <Button
                                danger
                                icon={<DeleteOutlined />}
                                size="small"
                                onClick={() => deleteUnit(record._id)}
                            >
                                Xóa
                            </Button>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <Card title="Quản lý đơn vị thực tập" style={{ margin: '0 auto' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Input
                    placeholder="Tìm kiếm theo tên đơn vị, người liên hệ, email..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                />

                <Space>
                    <Button onClick={fetchUnits}>
                        Làm mới
                    </Button>
                    {(user?.role && hasAnyRole(user.role, [UserRole.ADMIN, UserRole.L1])) && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => openModal()}
                        >
                            Thêm đơn vị
                        </Button>
                    )}
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={filteredUnits}
                rowKey="_id"
                loading={loading}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn vị`,
                }}
                scroll={{ x: 1000 }}
            />

            <Modal
                title={editingUnit ? 'Sửa đơn vị' : 'Thêm đơn vị mới'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={700}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="Tên đơn vị"
                        name="name"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đơn vị' }]}
                    >
                        <Input placeholder="Nhập tên đơn vị" />
                    </Form.Item>

                    <Form.Item
                        label="Địa chỉ"
                        name="address"
                        rules={[{ required: true, message: 'Vui lòng nhập địa chỉ' }]}
                    >
                        <TextArea rows={2} placeholder="Nhập địa chỉ đơn vị" />
                    </Form.Item>

                    <Form.Item
                        label="Người liên hệ"
                        name="contact_person"
                        rules={[{ required: true, message: 'Vui lòng nhập tên người liên hệ' }]}
                    >
                        <Input placeholder="Nhập tên người liên hệ" />
                    </Form.Item>

                    <Form.Item
                        label="Email liên hệ"
                        name="contact_email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input placeholder="Nhập email liên hệ" />
                    </Form.Item>

                    <Form.Item
                        label="Số điện thoại"
                        name="contact_phone"
                        rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                        <Input placeholder="Nhập số điện thoại" />
                    </Form.Item>

                    <Form.Item
                        label="Người quản lý đơn vị"
                        name="managers"
                        extra="Bạn có thể chọn bất cứ ai làm người quản lý. Hệ thống sẽ tự động cấp quyền L2 nếu cần."
                    >
                        <Select
                            mode="multiple"
                            placeholder="Chọn người quản lý"
                            optionFilterProp="children"
                            showSearch
                            filterOption={(input, option) => {
                                if (!option?.children) return false;
                                return option.children.toString().toLowerCase().includes(input.toLowerCase());
                            }}
                        >
                            {availableUsers.map(user => {
                                const roleArray = Array.isArray(user.role) ? user.role : [user.role];
                                const roleDisplay = roleArray.join(', ');
                                return (
                                    <Option key={user._id} value={user._id}>
                                        {user.full_name} ({user.email}) - {roleDisplay}
                                    </Option>
                                );
                            })}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Mô tả"
                        name="description"
                    >
                        <TextArea rows={3} placeholder="Nhập mô tả về đơn vị" />
                    </Form.Item>

                    <Form.Item
                        label="Trạng thái"
                        name="is_active"
                        valuePropName="checked"
                        initialValue={true}
                    >
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Không hoạt động" />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {editingUnit ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                            <Button onClick={() => setModalVisible(false)}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default UnitManagement;
