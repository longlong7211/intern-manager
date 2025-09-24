'use client';

import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Select, Button, message, Spin, Row, Col, Divider } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole, INTERNSHIP_CONSTANTS } from '@/types';

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
}

const StaffRegisterStudent: React.FC = () => {
    const { user } = useAuth();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [units, setUnits] = useState<Unit[]>([]);
    const [unitsLoading, setUnitsLoading] = useState(true);

    useEffect(() => {
        fetchUnits();
    }, []);

    const fetchUnits = async () => {
        try {
            setUnitsLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/units?active_only=true', {
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
                message.error('Không thể tải danh sách đơn vị thực tập');
            }
        } catch (error) {
            console.error('Error fetching units:', error);
            message.error('Lỗi khi tải danh sách đơn vị thực tập');
        } finally {
            setUnitsLoading(false);
        }
    };

    const handleSubmit = async (values: any) => {
        try {
            setLoading(true);
            message.loading('⏳ Đang xử lý đăng ký cho sinh viên...', 0);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/applications/staff-register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    // Thông tin sinh viên
                    full_name: values.full_name,
                    email: values.email,
                    student_code: values.student_code,
                    major: values.major,
                    phone: values.phone,
                    class_name: values.class_name,
                    // Thông tin đăng ký thực tập
                    unit_id: values.unit_id,
                    position_title: values.position_title,
                    description: values.description || '',
                    expected_start_date: values.expected_start_date,
                    expected_total_hours: values.expected_total_hours
                })
            });

            message.destroy(); // Clear loading message
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    message.success({
                        content: (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                    ✅ Đăng ký thực tập cho sinh viên thành công!
                                </div>
                                <div>👤 Sinh viên: <strong>{values.full_name}</strong></div>
                                <div>📧 Tài khoản đã được tạo:</div>
                                <div>• Tên đăng nhập: <strong>{values.student_code}</strong></div>
                                <div>• Mật khẩu: <strong>svlhu@2025</strong></div>
                                <div style={{ marginTop: '8px' }}>
                                    📋 Trạng thái đơn: <strong>{data.data.status}</strong>
                                </div>
                            </div>
                        ),
                        duration: 6
                    });
                    form.resetFields();
                } else {
                    message.error({
                        content: `❌ ${data.message || 'Lỗi khi đăng ký thực tập'}`,
                        duration: 4
                    });
                }
            } else {
                const errorData = await response.json();
                message.error({
                    content: `❌ ${errorData.message || 'Lỗi khi đăng ký thực tập'}`,
                    duration: 4
                });
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            message.destroy(); // Clear loading message
            message.error({
                content: '❌ Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.',
                duration: 4
            });
        } finally {
            setLoading(false);
        }
    };

    // Kiểm tra quyền truy cập
    const allowedRoles = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN];
    const hasPermission = user && (
        Array.isArray(user.role)
            ? user.role.some(role => allowedRoles.includes(role))
            : allowedRoles.includes(user.role)
    );

    if (!hasPermission) {
        return (
            <Card>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h3>Chỉ cán bộ quản lý mới có thể đăng ký thực tập cho sinh viên</h3>
                </div>
            </Card>
        );
    }

    return (
        <Card
            title="Đăng ký thực tập cho sinh viên"
            style={{ maxWidth: 900, margin: '0 auto' }}
        >
            <div style={{
                marginBottom: 24,
                padding: 16,
                backgroundColor: '#e6f7ff',
                border: '1px solid #91caff',
                borderRadius: 6
            }}>
                <h4 style={{ color: '#1890ff', marginBottom: 8 }}>👨‍💼 Quyền hạn của bạn:</h4>
                <p style={{ margin: 0, color: '#0958d9' }}>
                    Với vai trò <strong>{user.role}</strong>, bạn có thể đăng ký thực tập cho sinh viên.
                    Hệ thống sẽ tự động tạo tài khoản cho sinh viên nếu chưa có.
                </p>
            </div>

            <Spin spinning={unitsLoading}>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                    size="large"
                    initialValues={{
                        expected_total_hours: INTERNSHIP_CONSTANTS.DEFAULT_HOURS
                    }}
                >
                    {/* Thông tin sinh viên */}
                    <div style={{
                        marginBottom: 24,
                        padding: 16,
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #91caff',
                        borderRadius: 6
                    }}>
                        <h4 style={{ color: '#1890ff', marginBottom: 16 }}>📝 Thông tin sinh viên</h4>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Họ và tên"
                                    name="full_name"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập họ và tên!' },
                                        { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' }
                                    ]}
                                >
                                    <Input placeholder="Nhập họ và tên đầy đủ" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Mã sinh viên"
                                    name="student_code"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập mã sinh viên!' },
                                        { pattern: /^[A-Z0-9]+$/, message: 'Mã sinh viên chỉ chứa chữ hoa và số!' }
                                    ]}
                                >
                                    <Input placeholder="Ví dụ: SV2023001" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Email"
                                    name="email"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập email!' },
                                        { type: 'email', message: 'Email không hợp lệ!' }
                                    ]}
                                >
                                    <Input placeholder="email@example.com" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Số điện thoại"
                                    name="phone"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập số điện thoại!' },
                                        { pattern: /^[0-9]{10,11}$/, message: 'Số điện thoại phải có 10-11 số!' }
                                    ]}
                                >
                                    <Input placeholder="0123456789" />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    label="Chuyên ngành"
                                    name="major"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập chuyên ngành!' }
                                    ]}
                                >
                                    <Input placeholder="Ví dụ: Công nghệ thông tin, Kế toán, Marketing..." />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    label="Lớp"
                                    name="class_name"
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập lớp!' }
                                    ]}
                                >
                                    <Input placeholder="Ví dụ: CNTT-K15, KT-K14..." />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    {/* Thông tin thực tập */}
                    <div style={{
                        marginBottom: 24,
                        padding: 16,
                        backgroundColor: '#f6ffed',
                        border: '1px solid #b7eb8f',
                        borderRadius: 6
                    }}>
                        <h4 style={{ color: '#52c41a', marginBottom: 16 }}>🏢 Thông tin thực tập</h4>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item
                                    label="Đơn vị thực tập"
                                    name="unit_id"
                                    rules={[{ required: true, message: 'Vui lòng chọn đơn vị thực tập' }]}
                                >
                                    <Select
                                        placeholder="Chọn đơn vị thực tập"
                                        showSearch
                                        optionFilterProp="children"
                                        optionLabelProp="label"
                                        filterOption={(input, option) =>
                                            option?.children?.toString().toLowerCase().includes(input.toLowerCase()) || false
                                        }
                                        loading={unitsLoading}
                                    >
                                        {units.map(unit => (
                                            <Option key={unit._id} value={unit._id} label={unit.name}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{unit.name}</div>
                                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                                        {unit.address} - Liên hệ: {unit.contact_person}
                                                    </div>
                                                </div>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>

                            <Col span={24}>
                                <Form.Item
                                    label="Vị trí/Phòng ban"
                                    name="position_title"
                                    rules={[{ required: true, message: 'Vui lòng nhập vị trí thực tập' }]}
                                >
                                    <Input placeholder="Ví dụ: Phát triển phần mềm, Marketing, Kế toán..." />
                                </Form.Item>
                            </Col>

                            <Col span={12}>
                                <Form.Item
                                    label="Ngày bắt đầu dự kiến"
                                    name="expected_start_date"
                                    rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu' }]}
                                >
                                    <Input type="date" />
                                </Form.Item>
                            </Col>

                            <Col span={12}>
                                <Form.Item
                                    label="Thời gian thực tập (giờ)"
                                    name="expected_total_hours"
                                    initialValue={INTERNSHIP_CONSTANTS.DEFAULT_HOURS}
                                    rules={[
                                        { required: true, message: 'Vui lòng nhập thời gian thực tập' },
                                        { type: 'number', min: 100, max: 2000, message: 'Thời gian từ 100-2000 giờ' }
                                    ]}
                                >
                                    <Input type="number" placeholder="Số giờ" min={100} max={2000} />
                                </Form.Item>
                            </Col>

                            <Col span={24}>
                                <div style={{
                                    padding: 12,
                                    backgroundColor: '#f0f9ff',
                                    border: '1px solid #91caff',
                                    borderRadius: 6,
                                    marginBottom: 16
                                }}>
                                    <p style={{ margin: 0, color: '#0958d9', fontSize: '14px' }}>
                                        ⏰ <strong>Tiêu chuẩn:</strong> {INTERNSHIP_CONSTANTS.DEFAULT_HOURS} giờ
                                        (khoảng {Math.round(INTERNSHIP_CONSTANTS.DEFAULT_HOURS / INTERNSHIP_CONSTANTS.HOURS_PER_MONTH)} tháng)
                                    </p>
                                </div>
                            </Col>

                            <Col span={24}>
                                <Form.Item
                                    label="Mô tả và ghi chú (không bắt buộc)"
                                    name="description"
                                >
                                    <TextArea
                                        rows={4}
                                        placeholder="Mô tả về vị trí thực tập, yêu cầu, ghi chú đặc biệt..."
                                        showCount
                                        maxLength={500}
                                    />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            size="large"
                            style={{ minWidth: 200 }}
                        >
                            Đăng ký thực tập cho sinh viên
                        </Button>
                    </div>
                </Form>
            </Spin>

            <div style={{
                marginTop: 24,
                padding: 16,
                backgroundColor: '#fff7e6',
                border: '1px solid #ffd591',
                borderRadius: 6
            }}>
                <h4 style={{ color: '#fa8c16', marginBottom: 8 }}>🔐 Thông tin tài khoản sinh viên:</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#d46b08' }}>
                    <li>Hệ thống sẽ tự động tạo tài khoản cho sinh viên nếu chưa có</li>
                    <li><strong>Tên đăng nhập:</strong> Mã sinh viên</li>
                    <li><strong>Mật khẩu mặc định:</strong> svlhu@2025</li>
                    <li>Sinh viên nên đổi mật khẩu sau lần đăng nhập đầu tiên</li>
                </ul>
            </div>

            <div style={{
                marginTop: 16,
                padding: 16,
                backgroundColor: '#f6ffed',
                border: '1px solid #b7eb8f',
                borderRadius: 6
            }}>
                <h4 style={{ color: '#52c41a', marginBottom: 8 }}>📋 Lưu ý cho cán bộ quản lý:</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#389e0d' }}>
                    <li>Thời gian thực tập tiêu chuẩn: <strong>{INTERNSHIP_CONSTANTS.DEFAULT_HOURS} giờ</strong></li>
                    <li>Đơn đăng ký sẽ có trạng thái phù hợp với vai trò của bạn</li>
                    <li>L1: Đơn sẽ chờ duyệt bậc 2 (PENDING_L2)</li>
                    <li>L2/SUPERVISOR: Đơn được duyệt trực tiếp (APPROVED)</li>
                    <li>Thông tin sinh viên sẽ được lưu vào hệ thống</li>
                    <li>Kiểm tra kỹ thông tin trước khi submit</li>
                </ul>
            </div>
        </Card>
    );
};

export default StaffRegisterStudent;
