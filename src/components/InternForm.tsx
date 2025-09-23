'use client';

import React, { useEffect } from 'react';
import { Form, Input, Select, Button, Row, Col, message } from 'antd';
import { Intern, InternFormData } from '@/types';
import { internService } from '@/services/api';

const { Option } = Select;
const { TextArea } = Input;

interface InternFormProps {
    intern?: Intern | null;
    onSubmit: () => void;
    onCancel: () => void;
}

const InternForm: React.FC<InternFormProps> = ({ intern, onSubmit, onCancel }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (intern) {
            form.setFieldsValue({
                ...intern,
            });
        } else {
            form.resetFields();
        }
    }, [intern, form]);

    const handleSubmit = async (values: any) => {
        message.loading({
            content: intern ? '⏳ Đang cập nhật thông tin sinh viên...' : '⏳ Đang lưu thông tin sinh viên...',
            duration: 0
        });

        try {
            const formData: InternFormData = {
                ...values,
            };

            if (intern) {
                await internService.updateIntern(intern._id, formData);
            } else {
                await internService.createIntern(formData);
            }

            message.destroy(); // Clear loading message
            message.success({
                content: (
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            ✅ {intern ? 'Cập nhật thành công!' : 'Lưu thông tin thành công!'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            Sinh viên: {values.student_name || 'N/A'}
                            <br />
                            Mã sinh viên: {values.student_id || 'N/A'}
                        </div>
                    </div>
                ),
                duration: 3
            });

            onSubmit();
        } catch (error: any) {
            message.destroy(); // Clear loading message
            if (error.response?.status === 400) {
                message.error({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                ❌ Dữ liệu không hợp lệ
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {error.response?.data?.error || 'Vui lòng kiểm tra lại thông tin đã nhập'}
                            </div>
                        </div>
                    ),
                    duration: 5
                });
            } else {
                message.error({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                🔌 Lỗi khi lưu thông tin
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Không thể lưu thông tin sinh viên thực tập. Vui lòng thử lại.
                            </div>
                        </div>
                    ),
                    duration: 5
                });
            }
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{ status: 'pending' }}
        >
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Đợt thực tập"
                        name="internship_period"
                        rules={[{ required: true, message: 'Vui lòng nhập đợt thực tập' }]}
                    >
                        <Input placeholder="VD: Kỳ thực tập mùa hè 2024" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Họ và tên"
                        name="full_name"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                    >
                        <Input placeholder="Nhập họ và tên sinh viên" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Mã số sinh viên"
                        name="student_id"
                        rules={[{ required: true, message: 'Vui lòng nhập MSSV' }]}
                    >
                        <Input placeholder="Nhập mã số sinh viên" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Lớp"
                        name="class_name"
                    >
                        <Input placeholder="Nhập lớp" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Số điện thoại"
                        name="phone"
                    >
                        <Input placeholder="Nhập số điện thoại" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email' },
                            { type: 'email', message: 'Email không hợp lệ' }
                        ]}
                    >
                        <Input placeholder="Nhập email" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item
                        label="Vị trí thực tập"
                        name="position"
                    >
                        <Input placeholder="Nhập vị trí thực tập" />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Trạng thái"
                        name="status"
                    >
                        <Select placeholder="Chọn trạng thái">
                            <Option value="pending">Chờ duyệt</Option>
                            <Option value="approved">Đã duyệt</Option>
                            <Option value="rejected">Bị từ chối</Option>
                            <Option value="in_progress">Đang thực tập</Option>
                            <Option value="completed">Hoàn thành</Option>
                            <Option value="cancelled">Hủy bỏ</Option>
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item
                        label="Ghi chú"
                        name="notes"
                    >
                        <TextArea rows={3} placeholder="Nhập ghi chú" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item
                        label="Phản hồi từ bộ phận tiếp nhận thực tập"
                        name="department_feedback"
                    >
                        <TextArea rows={3} placeholder="Nhập phản hồi từ bộ phận" />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
                <Col span={24}>
                    <Form.Item
                        label="Ghi chú thêm"
                        name="additional_notes"
                    >
                        <TextArea rows={3} placeholder="Nhập ghi chú thêm" />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item style={{ marginTop: '24px', textAlign: 'right' }}>
                <Button onClick={onCancel} style={{ marginRight: '8px' }}>
                    Hủy
                </Button>
                <Button type="primary" htmlType="submit">
                    {intern ? 'Cập nhật' : 'Thêm'}
                </Button>
            </Form.Item>
        </Form>
    );
};

export default InternForm;
