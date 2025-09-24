'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Tag, Space, Modal, Form, Input, message, Spin, Select, Typography } from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined, EditOutlined, ApartmentOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { ApplicationStatus, UserRole } from '../types';

const { TextArea } = Input;
const { Option } = Select;
const { Title } = Typography;

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
    // For compatibility with populated fields
    student_id?: {
        _id: string;
        username: string;
        email: string;
        full_name: string;
        student_code?: string;
        class_name?: string;
        phone?: string;
    };
    unit_id?: {
        _id: string;
        name: string;
        location?: string;
    };
    approved_by_l1?: {
        _id: string;
        username: string;
        full_name: string;
    };
    approved_by_l2?: {
        _id: string;
        username: string;
        full_name: string;
    };
    // Legacy fields for backward compatibility
    student_snapshot?: {
        full_name: string;
        student_code?: string;
    };
    unit_snapshot?: {
        name: string;
    };
}

const UnitApplications: React.FC = () => {
    const { user } = useAuth();
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [reviewForm] = Form.useForm();

    useEffect(() => {
        fetchApplications();
    }, []);

    const fetchApplications = async () => {
        try {
            setLoading(true);

            // First check current user info for debugging
            const userResponse = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (userResponse.ok) {
                const userResult = await userResponse.json();
                if (userResult.success) {
                    console.log('Current L2 user data:', userResult.data);
                    console.log('User unit_id:', userResult.data.unit_id);
                    console.log('User roles:', userResult.data.role);
                }
            }

            // Use the pending applications API which handles L2 filtering automatically
            const apiUrl = `/api/applications/pending`;
            console.log('Fetching pending applications from:', apiUrl);

            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch applications');
            }

            const result = await response.json();
            if (result.success) {
                console.log('API Response data:', result.data);
                console.log('Total pending applications received:', result.data.length);

                // Log all statuses to see what we have
                const allStatuses = result.data.map((app: any) => app.status);
                console.log('All statuses in data:', [...new Set(allStatuses)]);

                // Log all units to verify unit filtering
                const allUnits = result.data.map((app: any) => app.unit_name || app.unit_id?.name);
                console.log('All units in data:', [...new Set(allUnits)]);

                // Count by status
                const statusCounts = allStatuses.reduce((acc: any, status: string) => {
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
                }, {});
                console.log('Status counts:', statusCounts);

                // The pending API already filters for L2 users, so we just need to show all results
                setApplications(result.data);

                // Show helpful message if no applications
                if (result.data.length === 0) {
                    console.log('No applications found for L2 user');
                    message.info('Hiện tại không có đơn đăng ký thực tập nào cần duyệt từ đơn vị của bạn');
                }
            } else {
                message.error(result.message || 'Không thể tải danh sách đơn');
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            message.error('Không thể kết nối đến server');
        } finally {
            setLoading(false);
        }
    }; const getStatusTag = (status: ApplicationStatus) => {
        const statusConfig = {
            [ApplicationStatus.DRAFT]: { color: 'default', text: 'Nháp' },
            [ApplicationStatus.SUBMITTED]: { color: 'blue', text: 'Đã nộp' },
            [ApplicationStatus.APPROVED_L1]: { color: 'orange', text: 'Đã duyệt L1' },
            [ApplicationStatus.REJECTED_L1]: { color: 'red', text: 'Từ chối L1' },
            [ApplicationStatus.REVISION_REQUESTED_L1]: { color: 'yellow', text: 'Yêu cầu sửa L1' },
            [ApplicationStatus.APPROVED_L2]: { color: 'green', text: 'Đã duyệt L2' },
            [ApplicationStatus.REJECTED_L2]: { color: 'red', text: 'Từ chối L2' },
            [ApplicationStatus.REVISION_REQUESTED_L2]: { color: 'yellow', text: 'Yêu cầu sửa L2' },
            [ApplicationStatus.APPROVED_FINAL]: { color: 'green', text: 'Đã duyệt cuối' },
        };

        const config = statusConfig[status] || { color: 'default', text: status };
        return <Tag color={config.color}>{config.text}</Tag>;
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

            const response = await fetch(`/api/applications/${selectedApplication._id}/l2-review`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    decision: values.action.toUpperCase(),
                    comment: values.notes
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
                                    Sinh viên: {selectedApplication.student_name || selectedApplication.student_id?.full_name || selectedApplication.student_snapshot?.full_name}
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
                        duration: 5
                    });

                    setReviewModalVisible(false);
                    fetchApplications(); // Refresh the list
                } else {
                    message.error(data.message || 'Có lỗi xảy ra khi xử lý đơn');
                }
            } else {
                const errorData = await response.json();
                message.error(errorData.message || 'Có lỗi xảy ra khi xử lý đơn');
            }
        } catch (error) {
            loadingMessage();
            console.error('Error reviewing application:', error);
            message.error('Lỗi kết nối khi xử lý đơn');
        }
    };

    const columns = [
        {
            title: 'Mã sinh viên',
            dataIndex: 'student_code',
            key: 'student_code',
            width: 120,
            render: (code: string, record: Application) => {
                return record.student_code ||
                    record.student_id?.student_code ||
                    record.student_snapshot?.student_code ||
                    record.student_id?.username ||
                    '-';
            },
        },
        {
            title: 'Họ tên',
            dataIndex: 'student_name',
            key: 'student_name',
            width: 180,
            render: (name: string, record: Application) => {
                return record.student_name ||
                    record.student_id?.full_name ||
                    record.student_snapshot?.full_name ||
                    record.student_id?.username ||
                    '-';
            },
        },
        {
            title: 'Email',
            dataIndex: 'student_email',
            key: 'student_email',
            width: 200,
            render: (email: string, record: Application) => {
                return record.student_email || record.student_id?.email || '-';
            },
        },
        {
            title: 'Vị trí mong muốn',
            dataIndex: 'position_title',
            key: 'position_title',
            width: 180,
            render: (text: string) => text || 'Chưa rõ',
        },
        {
            title: 'Đơn vị',
            dataIndex: 'unit_name',
            key: 'unit_name',
            width: 150,
            render: (name: string, record: Application) => {
                return record.unit_name ||
                    record.unit_id?.name ||
                    record.unit_snapshot?.name ||
                    '-';
            },
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 130,
            render: (status: ApplicationStatus) => getStatusTag(status),
        },
        {
            title: 'Ngày nộp',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 120,
            render: (date: string) => {
                return new Date(date).toLocaleDateString('vi-VN');
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            render: (_: any, record: Application) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => openReviewModal(record)}
                        disabled={record.status !== ApplicationStatus.APPROVED_L1}
                    >
                        {record.status === ApplicationStatus.APPROVED_L1 ? 'Duyệt' : 'Xem'}
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Card>
                <div style={{ marginBottom: '16px' }}>
                    <Title level={2}>
                        <ApartmentOutlined /> Duyệt thực tập đơn vị
                    </Title>
                    <p style={{ color: '#666', margin: 0 }}>
                        Danh sách đơn đăng ký thực tập đã được duyệt sơ bộ (L1) thuộc đơn vị của bạn và chờ duyệt từ đơn vị
                    </p>
                </div>

                <Table
                    columns={columns}
                    dataSource={applications}
                    rowKey="_id"
                    loading={loading}
                    scroll={{ x: 1200 }}
                    locale={{
                        emptyText: 'Không có đơn đăng ký thực tập nào cần duyệt từ đơn vị của bạn'
                    }}
                    pagination={{
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} của ${total} đơn`,
                    }}
                />
            </Card>

            {/* Review Modal */}
            <Modal
                title={`Duyệt đơn thực tập - ${selectedApplication?.student_name || selectedApplication?.student_id?.full_name || selectedApplication?.student_snapshot?.full_name || 'N/A'}`}
                open={reviewModalVisible}
                onCancel={() => setReviewModalVisible(false)}
                footer={null}
                width={600}
            >
                {selectedApplication && (
                    <div>
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            <div><strong>Sinh viên:</strong> {selectedApplication.student_name || selectedApplication.student_id?.full_name || selectedApplication.student_snapshot?.full_name || 'N/A'}</div>
                            <div><strong>Mã SV:</strong> {selectedApplication.student_code || selectedApplication.student_id?.student_code || selectedApplication.student_snapshot?.student_code || selectedApplication.student_id?.username || 'Chưa có'}</div>
                            <div><strong>Email:</strong> {selectedApplication.student_email || selectedApplication.student_id?.email || 'N/A'}</div>
                            <div><strong>Vị trí:</strong> {selectedApplication.position_title || 'Chưa rõ'}</div>
                            <div><strong>Đơn vị:</strong> {selectedApplication.unit_name || selectedApplication.unit_id?.name || selectedApplication.unit_snapshot?.name || 'N/A'}</div>
                            {selectedApplication.l1_review_notes && (
                                <div><strong>Ghi chú L1:</strong> {selectedApplication.l1_review_notes}</div>
                            )}
                        </div>

                        <Form
                            form={reviewForm}
                            layout="vertical"
                            onFinish={handleReview}
                        >
                            <Form.Item
                                name="action"
                                label="Quyết định"
                                rules={[{ required: true, message: 'Vui lòng chọn quyết định' }]}
                            >
                                <Select placeholder="Chọn quyết định">
                                    <Option value="approve">✅ Duyệt đơn</Option>
                                    <Option value="reject">❌ Từ chối</Option>
                                    <Option value="revision_requested">📝 Yêu cầu chỉnh sửa</Option>
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="notes"
                                label="Ghi chú"
                                rules={[{ required: true, message: 'Vui lòng nhập ghi chú' }]}
                            >
                                <TextArea
                                    rows={4}
                                    placeholder="Nhập ghi chú về quyết định của bạn..."
                                />
                            </Form.Item>

                            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                                <Space>
                                    <Button onClick={() => setReviewModalVisible(false)}>
                                        Hủy
                                    </Button>
                                    <Button type="primary" htmlType="submit">
                                        Xác nhận
                                    </Button>
                                </Space>
                            </Form.Item>
                        </Form>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default UnitApplications;
