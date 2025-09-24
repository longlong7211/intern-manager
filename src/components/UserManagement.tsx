import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Modal, Form, Input, Select, message, Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, EditOutlined, DeleteOutlined, PlusOutlined, TeamOutlined, SafetyOutlined } from '@ant-design/icons';
import { UserRole } from '@/types';
import { useNotification } from '@/hooks/useNotification';

const { Option } = Select;

interface User {
    _id: string;
    username: string;
    email: string;
    full_name: string;
    role: UserRole | UserRole[];
    status: 'active' | 'inactive';
    unit_id?: string;
    created_at: string;
    updated_at: string;
}

interface Unit {
    _id: string;
    name: string;
    description: string;
}

const UserManagement: React.FC = () => {
    const { contextHolder, notification } = useNotification();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [form] = Form.useForm();
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        admin: 0,
        l1: 0,
        l2: 0,
        students: 0
    });

    // Fetch units for form selection
    const fetchUnits = async () => {
        try {
            const response = await fetch('/api/units', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
            });
            if (response.ok) {
                const result = await response.json();
                console.log('Units response:', result);
                // The API returns { success: true, data: units[], pagination: {...} }
                const unitsData = result.data || [];
                setUnits(Array.isArray(unitsData) ? unitsData : []);
            }
        } catch (error) {
            console.error('Error fetching units:', error);
            setUnits([]); // Set empty array on error
        }
    };

    useEffect(() => {
        // Test if message system is working
        notification.info({
            message: 'Đang khởi tạo',
            description: 'Đang khởi tạo trang quản lý người dùng...',
            key: 'init',
            duration: 1.5,
        });

        const hideLoading = message.loading('Đang tải dữ liệu...', 0);

        const loadData = async () => {
            await Promise.all([
                fetchCurrentUser(),
                fetchUsers(),
                fetchUnits()
            ]);

            hideLoading();
            notification.success({
                message: 'Tải dữ liệu thành công',
                description: 'Tất cả dữ liệu đã được tải thành công!',
                duration: 2,
            });
        };

        loadData();
    }, []); const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/users/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data.data);
                console.log('Current user:', data.data);
            } else {
                const errorData = await response.json();
                notification.warning({
                    message: 'Cảnh báo',
                    description: 'Không thể tải thông tin người dùng hiện tại',
                    duration: 3,
                });
            }
        } catch (error) {
            console.error('Error fetching current user:', error);
            notification.warning({
                message: 'Cảnh báo',
                description: 'Lỗi kết nối khi tải thông tin người dùng',
                duration: 3,
            });
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching users with token:', token ? 'Present' : 'Missing');

            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Users data:', data);
                setUsers(data.data || []);
                calculateStats(data.data || []);
            } else {
                const errorData = await response.json();
                console.error('Error response:', errorData);
                notification.error({
                    message: 'Lỗi tải dữ liệu',
                    description: errorData.message || 'Không thể tải danh sách người dùng từ server.',
                    duration: 5,
                });
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            notification.error({
                message: 'Lỗi kết nối',
                description: 'Không thể kết nối đến server để tải danh sách người dùng.',
                duration: 5,
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (userList: User[]) => {
        const newStats = {
            total: userList.length,
            active: userList.filter(user => user.status === 'active').length,
            inactive: userList.filter(user => user.status === 'inactive').length,
            admin: userList.filter(user =>
                Array.isArray(user.role)
                    ? user.role.includes(UserRole.ADMIN)
                    : user.role === UserRole.ADMIN
            ).length,
            l1: userList.filter(user =>
                Array.isArray(user.role)
                    ? user.role.includes(UserRole.L1)
                    : user.role === UserRole.L1
            ).length,
            l2: userList.filter(user =>
                Array.isArray(user.role)
                    ? user.role.includes(UserRole.L2)
                    : user.role === UserRole.L2
            ).length,
            students: userList.filter(user =>
                Array.isArray(user.role)
                    ? user.role.includes(UserRole.STUDENT)
                    : user.role === UserRole.STUDENT
            ).length
        };
        setStats(newStats);
    };

    const getRoleDisplay = (role: UserRole | UserRole[]) => {
        const roles = Array.isArray(role) ? role : [role];
        return roles.map(r => {
            let color = 'default';
            let text: string = r;

            switch (r) {
                case UserRole.ADMIN:
                    color = 'red';
                    text = 'Admin';
                    break;
                case UserRole.SUPERVISOR:
                    color = 'purple';
                    text = 'Giám sát';
                    break;
                case UserRole.L1:
                    color = 'orange';
                    text = 'L1';
                    break;
                case UserRole.L2:
                    color = 'blue';
                    text = 'L2';
                    break;
                case UserRole.STUDENT:
                    color = 'green';
                    text = 'Sinh viên';
                    break;
            }

            return <Tag key={r} color={color}>{text}</Tag>;
        });
    }; const handleEdit = (user: User) => {
        setEditingUser(user);
        form.setFieldsValue({
            username: user.username,
            email: user.email,
            full_name: user.full_name,
            role: Array.isArray(user.role) ? user.role : [user.role],
            status: user.status
        });
        setIsModalVisible(true);
    };

    const handleCreate = () => {
        setEditingUser(null);
        form.resetFields();
        // Set default values for required fields
        form.setFieldsValue({
            status: 'active'
        });
        setIsModalVisible(true);
    };

    const getAvailableRoles = () => {
        if (!currentUser) return [];

        const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const canCreateAllRoles = userRoles.some((role: any) =>
            [UserRole.ADMIN, UserRole.L1].includes(role)
        );
        const isL2 = userRoles.includes(UserRole.L2);
        const isAdmin = userRoles.includes(UserRole.ADMIN);

        if (isL2 && !canCreateAllRoles) {
            // L2 can only create other L2s
            return [UserRole.L2];
        } else if (canCreateAllRoles) {
            // Admin can create all, L1 can create all except Admin
            return isAdmin
                ? [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.L1, UserRole.L2, UserRole.STUDENT]
                : [UserRole.SUPERVISOR, UserRole.L1, UserRole.L2, UserRole.STUDENT];
        }

        return [];
    };

    const canCreateUsers = () => {
        if (!currentUser) return false;

        const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        return userRoles.some((role: any) =>
            [UserRole.ADMIN, UserRole.L1, UserRole.L2].includes(role)
        );
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            console.log('Form values before submission:', values);

            // Ensure all required fields are present
            const requiredFields = ['username', 'email', 'full_name', 'role', 'status'];
            if (!editingUser) {
                requiredFields.push('password');
            }

            const missingFields = requiredFields.filter(field => !values[field]);
            if (missingFields.length > 0) {
                console.error('Missing required fields:', missingFields);
                notification.warning({
                    message: 'Thông tin chưa đầy đủ',
                    description: `Vui lòng điền đầy đủ các trường: ${missingFields.join(', ')}`,
                    duration: 5,
                });
                return;
            }

            const token = localStorage.getItem('token');

            const url = editingUser ? `/api/users/${editingUser._id}` : '/api/users';
            const method = editingUser ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(values)
            });

            console.log('Request data:', values);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (response.ok) {
                const data = await response.json();
                console.log('Success response data:', data);

                const successMessage = editingUser ? 'Cập nhật người dùng thành công!' : 'Tạo người dùng mới thành công!';
                const successDescription = editingUser
                    ? `Người dùng "${values.full_name}" đã được cập nhật.`
                    : `Người dùng "${values.full_name}" đã được tạo thành công với tên đăng nhập "${values.username}".`;

                // Use the new notification hook
                notification.success({
                    message: successMessage,
                    description: successDescription,
                    duration: 5,
                });

                setIsModalVisible(false);
                form.resetFields();
                await fetchUsers();
            } else {
                const data = await response.json();
                console.log('Error response:', data);

                notification.error({
                    message: 'Lỗi khi tạo/cập nhật người dùng',
                    description: data.message || 'Có lỗi xảy ra khi xử lý yêu cầu. Vui lòng thử lại.',
                    duration: 6,
                });
            }
        } catch (error) {
            console.error('Error submitting user:', error);
            notification.error({
                message: 'Lỗi kết nối',
                description: 'Không thể kết nối đến server. Vui lòng kiểm tra mạng và thử lại.',
                duration: 6,
            });
        }
    };

    const handleDelete = (user: User) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: `Bạn có chắc chắn muốn xóa người dùng "${user.full_name}"?`,
            okText: 'Xóa',
            cancelText: 'Hủy',
            okType: 'danger',
            onOk: async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/users/${user._id}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (response.ok) {
                        notification.success({
                            message: 'Xóa người dùng thành công',
                            description: `Người dùng "${user.full_name}" đã được xóa khỏi hệ thống.`,
                            duration: 4,
                        });
                        fetchUsers();
                    } else {
                        const data = await response.json();
                        notification.error({
                            message: 'Lỗi khi xóa người dùng',
                            description: data.message || 'Có lỗi xảy ra khi xóa người dùng. Vui lòng thử lại.',
                            duration: 5,
                        });
                    }
                } catch (error) {
                    console.error('Error deleting user:', error);
                    notification.error({
                        message: 'Lỗi kết nối',
                        description: 'Không thể kết nối đến server để xóa người dùng.',
                        duration: 5,
                    });
                }
            }
        });
    };

    const columns = [
        {
            title: 'Tên đăng nhập',
            dataIndex: 'username',
            key: 'username',
            width: 150,
        },
        {
            title: 'Họ tên',
            dataIndex: 'full_name',
            key: 'full_name',
            width: 200,
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            width: 250,
        },
        {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 200,
            render: (role: UserRole | UserRole[]) => getRoleDisplay(role),
        },
        {
            title: 'Đơn vị',
            dataIndex: 'unit_id',
            key: 'unit_id',
            width: 150,
            render: (unit_id: string) => {
                if (!unit_id) return '-';
                if (!Array.isArray(units)) return unit_id;
                const unit = units.find(u => u._id === unit_id);
                return unit ? unit.name : unit_id;
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            render: (status: string) => (
                <Tag color={status === 'active' ? 'green' : 'red'}>
                    {status === 'active' ? 'Hoạt động' : 'Không hoạt động'}
                </Tag>
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 150,
            render: (record: User) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                    >
                        Sửa
                    </Button>
                    <Button
                        type="link"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record)}
                    >
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            {contextHolder}
            <div style={{ marginBottom: '24px' }}>
                <h1>
                    <TeamOutlined /> Quản lý người dùng
                </h1>

                {/* Debug info - Temporary */}
                {process.env.NODE_ENV === 'development' && (
                    <div style={{
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '12px'
                    }}>
                        <strong>Debug Info:</strong><br />
                        Loading: {loading.toString()}<br />
                        Users count: {users.length}<br />
                        Token: {localStorage.getItem('token') ? 'Present' : 'Missing'}<br />
                        Current user: {currentUser ? `${currentUser.username} (${Array.isArray(currentUser.role) ? currentUser.role.join(', ') : currentUser.role})` : 'Loading...'}
                    </div>
                )}

                {/* Statistics */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={4}>
                        <Card>
                            <Statistic title="Tổng số" value={stats.total} prefix={<UserOutlined />} />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Hoạt động"
                                value={stats.active}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Admin"
                                value={stats.admin}
                                valueStyle={{ color: '#f5222d' }}
                                prefix={<SafetyOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="L1"
                                value={stats.l1}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="L2"
                                value={stats.l2}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Sinh viên"
                                value={stats.students}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {stats.total === 0 && !loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        backgroundColor: '#fff2e8',
                        border: '1px solid #ffbb96',
                        borderRadius: '6px',
                        marginBottom: '24px'
                    }}>
                        <h3>Không thể tải danh sách người dùng</h3>
                        <p>Có thể do một trong các nguyên nhân sau:</p>
                        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
                            <li>Tài khoản hiện tại không có quyền Admin</li>
                            <li>Lỗi kết nối đến cơ sở dữ liệu</li>
                            <li>Token đã hết hạn</li>
                        </ul>
                        <p style={{ marginTop: '20px' }}>
                            <strong>Hướng dẫn:</strong> Đăng nhập bằng tài khoản Admin hoặc liên hệ quản trị viên hệ thống.
                        </p>
                        <Button onClick={fetchUsers} style={{ marginTop: '16px' }}>
                            Thử lại
                        </Button>
                    </div>
                )}

                {canCreateUsers() && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleCreate}
                        style={{ marginBottom: '16px' }}
                    >
                        Tạo người dùng mới
                    </Button>
                )}
            </div>

            <Table
                columns={columns}
                dataSource={users}
                rowKey="_id"
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} người dùng`,
                }}
                scroll={{ x: 1200 }}
            />

            {/* Create/Edit Modal */}
            <Modal
                title={editingUser ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}
                open={isModalVisible}
                onOk={handleSubmit}
                onCancel={() => setIsModalVisible(false)}
                okText={editingUser ? 'Cập nhật' : 'Tạo'}
                cancelText="Hủy"
                width={600}
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Tên đăng nhập"
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
                    >
                        <Input placeholder="Nhập tên đăng nhập" />
                    </Form.Item>

                    <Form.Item
                        label="Họ tên"
                        name="full_name"
                        rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                        <Input placeholder="Nhập họ tên đầy đủ" />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không đúng định dạng' }
                        ]}
                    >
                        <Input placeholder="Nhập địa chỉ email" />
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu' },
                                { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' }
                            ]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                    )}

                    <Form.Item
                        label="Vai trò"
                        name="role"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                    >
                        <Select
                            mode="multiple"
                            placeholder="Chọn vai trò"
                            allowClear
                            onChange={(value) => {
                                // Clear unit_id if L2 is not selected
                                if (!value || !value.includes(UserRole.L2)) {
                                    form.setFieldsValue({ unit_id: undefined });
                                }
                            }}
                        >
                            {getAvailableRoles().map(role => {
                                const roleLabels = {
                                    [UserRole.ADMIN]: 'Admin',
                                    [UserRole.SUPERVISOR]: 'Giám sát',
                                    [UserRole.L1]: 'L1',
                                    [UserRole.L2]: 'L2',
                                    [UserRole.STUDENT]: 'Sinh viên'
                                };
                                return (
                                    <Option key={role} value={role}>
                                        {roleLabels[role]}
                                    </Option>
                                );
                            })}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Đơn vị"
                        name="unit_id"
                        dependencies={['role']}
                        rules={[
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    const selectedRoles = getFieldValue('role') || [];
                                    const hasL2Role = Array.isArray(selectedRoles)
                                        ? selectedRoles.includes(UserRole.L2)
                                        : selectedRoles === UserRole.L2;

                                    if (hasL2Role && !value) {
                                        return Promise.reject('Vui lòng chọn đơn vị cho vai trò L2');
                                    }
                                    return Promise.resolve();
                                },
                            }),
                        ]}
                        help="Bắt buộc cho vai trò L2. L2 chỉ có thể tạo L2 thuộc đơn vị của mình."
                    >
                        <Select
                            placeholder="Chọn đơn vị"
                            allowClear
                        >
                            <Option value="">Không chọn đơn vị</Option>
                            {Array.isArray(units) && units.map(unit => (
                                <Option key={unit._id} value={unit._id}>
                                    {unit.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Trạng thái"
                        name="status"
                        rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                    >
                        <Select placeholder="Chọn trạng thái">
                            <Option value="active">Hoạt động</Option>
                            <Option value="inactive">Không hoạt động</Option>
                        </Select>
                    </Form.Item>

                    {!editingUser && (
                        <Form.Item
                            label="Mật khẩu"
                            name="password"
                            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                        >
                            <Input.Password placeholder="Nhập mật khẩu" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagement;
