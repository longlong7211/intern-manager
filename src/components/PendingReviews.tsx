'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, message, Spin, Select } from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ApplicationStatus, UserRole } from '../types';

const { TextArea } = Input;
const { Option } = Select;

interface Application {
    _id: string;
    student_name: string;
    student_email: string;
    student_code?: string;
    unit_name: string;
    position_title?: string;
    description?: string;
    status: ApplicationStatus;
    created_at: string;
    l1_review_notes?: string;
    l2_review_notes?: string;
    supervisor_notes?: string;
}

const PendingReviews: React.FC = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [reviewForm] = Form.useForm();

    useEffect(() => {
        fetchPendingApplications();
    }, []);

    const fetchPendingApplications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const response = await fetch('/api/applications/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setApplications(data.data || []);
                }
            } else {
                message.error('Không thể tải danh sách đơn chờ duyệt');
            }
        } catch (error) {
            console.error('Error fetching pending applications:', error);
            message.error('Lỗi khi tải danh sách đơn chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: ApplicationStatus) => {
        switch (status) {
            case 'SUBMITTED': return 'gold';
            case 'APPROVED_L1': return 'cyan';
            case 'APPROVED_L2': return 'lime';
            case 'APPROVED_FINAL': return 'green';
            case 'REJECTED_L1':
            case 'REJECTED_L2': return 'red';
            case 'REVISION_REQUESTED_L1':
            case 'REVISION_REQUESTED_L2': return 'orange';
            default: return 'default';
        }
    };

    const getStatusText = (status: ApplicationStatus) => {
        switch (status) {
            case 'SUBMITTED': return 'Đã nộp';
            case 'APPROVED_L1': return 'Duyệt L1';
            case 'APPROVED_L2': return 'Duyệt L2';
            case 'APPROVED_FINAL': return 'Đã duyệt';
            case 'REJECTED_L1': return 'Từ chối L1';
            case 'REJECTED_L2': return 'Từ chối L2';
            case 'REVISION_REQUESTED_L1': return 'Yêu cầu sửa L1';
            case 'REVISION_REQUESTED_L2': return 'Yêu cầu sửa L2';
            default: return status;
        }
    };

    const openReviewModal = (application: Application) => {
        setSelectedApplication(application);
        setReviewModalVisible(true);
        reviewForm.resetFields();
    };

    const handleReview = async (values: any) => {
        if (!selectedApplication) return;

        const actionText = values.action === 'approve' ? 'duyệt' :
            values.action === 'reject' ? 'từ chối' :
                'yêu cầu chỉnh sửa';

        const loadingMessage = message.loading({
            content: `⏳ Đang ${actionText} đơn ứng tuyển...`,
            duration: 0
        });

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(`/api/applications/${selectedApplication._id}/review`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: values.action,
                    notes: values.notes
                })
            });

            loadingMessage();

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    const successIcon = values.action === 'approve' ? '✅' :
                        values.action === 'reject' ? '❌' : '📝';

                    message.success({
                        content: (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                    {successIcon} Đã {actionText} đơn thành công!
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    Sinh viên: {selectedApplication.student_name}
                                    <br />
                                    Vị trí: {selectedApplication.position_title}
                                    {values.notes && (
                                        <>
                                            <br />
                                            Ghi chú: {values.notes.length > 30 ? values.notes.substring(0, 30) + '...' : values.notes}
                                        </>
                                    )}
                                </div>
                            </div>
                        ),
                        duration: 4
                    });
                    setReviewModalVisible(false);
                    fetchPendingApplications();
                } else {
                    message.error({
                        content: (
                            <div>
                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                    ❌ Lỗi khi {actionText} đơn ứng tuyển
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                    {data.message || 'Có lỗi xảy ra trong quá trình xử lý'}
                                </div>
                            </div>
                        ),
                        duration: 5
                    });
                }
            } else {
                message.error({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                ❌ Lỗi khi {actionText} đơn ứng tuyển
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Máy chủ trả về lỗi. Vui lòng thử lại sau.
                            </div>
                        </div>
                    ),
                    duration: 5
                });
            }
        } catch (error) {
            loadingMessage();
            console.error('Error reviewing application:', error);
            message.error({
                content: (
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            🔌 Lỗi kết nối
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.
                        </div>
                    </div>
                ),
                duration: 5
            });
        }
    };

    const viewApplicationDetail = (application: Application) => {
        Modal.info({
            title: `Chi tiết đơn đăng ký: ${application.student_name}`,
            width: 700,
            content: (
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 16 }}>
                        <h4>Thông tin sinh viên:</h4>
                        <p><strong>Họ tên:</strong> {application.student_name}</p>
                        <p><strong>Email:</strong> {application.student_email}</p>
                        <p><strong>Mã sinh viên:</strong> {application.student_code}</p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <h4>Thông tin thực tập:</h4>
                        <p><strong>Đơn vị:</strong> {application.unit_name}</p>
                        <p><strong>Vị trí:</strong> {application.position_title}</p>
                        <p><strong>Mô tả:</strong> {application.description}</p>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <h4>Trạng thái:</h4>
                        <Tag color={getStatusColor(application.status)}>
                            {getStatusText(application.status)}
                        </Tag>
                    </div>

                    {application.l1_review_notes && (
                        <div style={{ marginBottom: 16 }}>
                            <h4>Ghi chú L1:</h4>
                            <p>{application.l1_review_notes}</p>
                        </div>
                    )}

                    {application.l2_review_notes && (
                        <div style={{ marginBottom: 16 }}>
                            <h4>Ghi chú L2:</h4>
                            <p>{application.l2_review_notes}</p>
                        </div>
                    )}

                    {application.supervisor_notes && (
                        <div style={{ marginBottom: 16 }}>
                            <h4>Ghi chú giám sát:</h4>
                            <p>{application.supervisor_notes}</p>
                        </div>
                    )}

                    <div>
                        <h4>Ngày nộp:</h4>
                        <p>{new Date(application.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                </div>
            ),
        });
    };

    const getAvailableActions = () => {
        if (user?.role === UserRole.L1) {
            return [
                { value: 'approve_l1', label: 'Duyệt (L1)' },
                { value: 'reject_l1', label: 'Từ chối (L1)' },
                { value: 'request_revision_l1', label: 'Yêu cầu sửa đổi (L1)' }
            ];
        }

        if (user?.role === UserRole.L2) {
            return [
                { value: 'approve_l2', label: 'Duyệt (L2)' },
                { value: 'reject_l2', label: 'Từ chối (L2)' },
                { value: 'request_revision_l2', label: 'Yêu cầu sửa đổi (L2)' }
            ];
        }

        if (user?.role === UserRole.SUPERVISOR) {
            return [
                { value: 'approve_final', label: 'Duyệt cuối cùng' },
                { value: 'reject_final', label: 'Từ chối cuối cùng' }
            ];
        }

        return [];
    };

    const columns = [
        {
            title: 'Sinh viên',
            key: 'student',
            render: (record: Application) => (
                <div>
                    <div style={{ fontWeight: 'bold' }}>{record.student_name}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.student_code}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{record.student_email}</div>
                </div>
            ),
        },
        {
            title: 'Đơn vị thực tập',
            dataIndex: 'unit_name',
            key: 'unit_name',
        },
        {
            title: 'Vị trí',
            dataIndex: 'position_title',
            key: 'position_title',
        },
        {
            title: 'Trạng thái',
            key: 'status',
            render: (record: Application) => (
                <Tag color={getStatusColor(record.status)}>
                    {getStatusText(record.status)}
                </Tag>
            ),
        },
        {
            title: 'Ngày nộp',
            key: 'created_at',
            render: (record: Application) => (
                new Date(record.created_at).toLocaleDateString('vi-VN')
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (record: Application) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => viewApplicationDetail(record)}
                    >
                        Chi tiết
                    </Button>
                    <Button
                        type="default"
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => openReviewModal(record)}
                    >
                        Duyệt
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Card title="Đơn đăng ký chờ duyệt" style={{ margin: '0 auto' }}>
            <div style={{ marginBottom: 16 }}>
                <Button onClick={fetchPendingApplications}>
                    Làm mới
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={applications}
                rowKey="_id"
                loading={loading}
                pagination={{
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
                }}
                scroll={{ x: 1000 }}
            />

            <Modal
                title={`Duyệt đơn: ${selectedApplication?.student_name}`}
                open={reviewModalVisible}
                onCancel={() => setReviewModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form
                    form={reviewForm}
                    layout="vertical"
                    onFinish={handleReview}
                >
                    <Form.Item
                        label="Hành động"
                        name="action"
                        rules={[{ required: true, message: 'Vui lòng chọn hành động' }]}
                    >
                        <Select placeholder="Chọn hành động">
                            {getAvailableActions().map(action => (
                                <Option key={action.value} value={action.value}>
                                    {action.label}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Ghi chú"
                        name="notes"
                        rules={[{ required: true, message: 'Vui lòng nhập ghi chú' }]}
                    >
                        <TextArea
                            rows={4}
                            placeholder="Nhập ghi chú về quyết định duyệt..."
                        />
                    </Form.Item>

                    <Form.Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Xác nhận
                            </Button>
                            <Button onClick={() => setReviewModalVisible(false)}>
                                Hủy
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default PendingReviews;
