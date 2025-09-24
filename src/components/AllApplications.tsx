import React, { useState, useEffect } from 'react';
import { Table, Tag, Button, Space, Modal, Input, message, Select, DatePicker, Card, Statistic, Row, Col } from 'antd';
import { EyeOutlined, CheckOutlined, CloseOutlined, EditOutlined, PlayCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { ApplicationStatus, UserRole } from '@/types';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface Application {
    _id: string;
    student_id: {
        _id: string;
        username: string;
        email: string;
        student_code?: string;
        full_name?: string;
        class_name?: string;
        phone?: string;
    };
    unit_id: {
        _id: string;
        name: string;
        location: string;
    };
    position_title: string;
    description: string;
    expected_start_date: string;
    expected_total_hours: number;
    status: ApplicationStatus;
    application_date: string;
    approved_by_l1?: {
        _id: string;
        username: string;
    };
    approved_by_l2?: {
        _id: string;
        username: string;
    };
    l1_approval_date?: string;
    l2_approval_date?: string;
    comment_l1?: string;
    comment_l2?: string;
    created_by_staff?: {
        _id: string;
        username: string;
        role: UserRole;
    };
    actual_start_date?: string;
    internship_status?: string;
}

interface User {
    _id: string;
    username: string;
    role: UserRole;
}

const AllApplicationsPage: React.FC = () => {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [approveModalVisible, setApproveModalVisible] = useState(false);
    const [startInternshipModalVisible, setStartInternshipModalVisible] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
    const [approveAction, setApproveAction] = useState<'approve' | 'reject' | 'request_revision'>('approve');
    const [comment, setComment] = useState('');
    const [actualStartDate, setActualStartDate] = useState<dayjs.Dayjs | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');
    const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
    const [unitFilter, setUnitFilter] = useState<string>('all');

    // Statistics
    const [stats, setStats] = useState({
        total: 0,
        submitted: 0,
        approved_l1: 0,
        approved_l2: 0,
        approved_final: 0,
        rejected: 0,
        active_internships: 0
    });

    useEffect(() => {
        fetchCurrentUser();
        fetchApplications();
    }, [statusFilter, dateRange, unitFilter]);

    const fetchCurrentUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data.user);
            }
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/api/applications';

            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }
            if (dateRange) {
                params.append('start_date', dateRange[0].format('YYYY-MM-DD'));
                params.append('end_date', dateRange[1].format('YYYY-MM-DD'));
            }
            if (unitFilter !== 'all') {
                params.append('unit_id', unitFilter);
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setApplications(data.data || []);
                calculateStats(data.data || []);
            } else {
                message.error('Không thể tải danh sách đơn đăng ký');
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            message.error('Lỗi kết nối');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (apps: Application[]) => {
        const newStats = {
            total: apps.length,
            submitted: apps.filter(app => app.status === ApplicationStatus.SUBMITTED).length,
            approved_l1: apps.filter(app => app.status === ApplicationStatus.APPROVED_L1).length,
            approved_l2: apps.filter(app => app.status === ApplicationStatus.APPROVED_L2).length,
            approved_final: apps.filter(app => app.status === ApplicationStatus.APPROVED_FINAL).length,
            rejected: apps.filter(app =>
                app.status === ApplicationStatus.REJECTED_L1 ||
                app.status === ApplicationStatus.REJECTED_L2
            ).length,
            active_internships: apps.filter(app =>
                app.status === ApplicationStatus.APPROVED_FINAL &&
                app.internship_status === 'ACTIVE'
            ).length
        };
        setStats(newStats);
    };

    const getStatusColor = (status: ApplicationStatus) => {
        switch (status) {
            case ApplicationStatus.SUBMITTED: return 'blue';
            case ApplicationStatus.APPROVED_L1: return 'orange';
            case ApplicationStatus.APPROVED_L2: return 'orange';
            case ApplicationStatus.APPROVED_FINAL: return 'green';
            case ApplicationStatus.REJECTED_L1:
            case ApplicationStatus.REJECTED_L2: return 'red';
            case ApplicationStatus.REVISION_REQUESTED_L1:
            case ApplicationStatus.REVISION_REQUESTED_L2: return 'yellow';
            default: return 'default';
        }
    };

    const getStatusText = (status: ApplicationStatus) => {
        switch (status) {
            case ApplicationStatus.SUBMITTED: return 'Đã nộp';
            case ApplicationStatus.APPROVED_L1: return 'L1 đã duyệt';
            case ApplicationStatus.APPROVED_L2: return 'L2 đã duyệt';
            case ApplicationStatus.APPROVED_FINAL: return 'Đã duyệt hoàn thành';
            case ApplicationStatus.REJECTED_L1: return 'L1 từ chối';
            case ApplicationStatus.REJECTED_L2: return 'L2 từ chối';
            case ApplicationStatus.REVISION_REQUESTED_L1: return 'L1 yêu cầu sửa';
            case ApplicationStatus.REVISION_REQUESTED_L2: return 'L2 yêu cầu sửa';
            default: return status;
        }
    };

    const canApprove = (application: Application) => {
        if (!currentUser) return false;

        const { role } = currentUser;
        const { status } = application;

        if (role === UserRole.ADMIN || role === UserRole.SUPERVISOR) return true;

        if (role === UserRole.L1) {
            return status === ApplicationStatus.SUBMITTED ||
                status === ApplicationStatus.APPROVED_L2 ||
                status === ApplicationStatus.REVISION_REQUESTED_L1;
        }

        if (role === UserRole.L2) {
            return status === ApplicationStatus.SUBMITTED ||
                status === ApplicationStatus.APPROVED_L1 ||
                status === ApplicationStatus.REVISION_REQUESTED_L2;
        }

        return false;
    };

    const canStartInternship = (application: Application) => {
        if (!currentUser) return false;

        const { role } = currentUser;
        return (role === UserRole.L2 || role === UserRole.SUPERVISOR || role === UserRole.ADMIN) &&
            application.status === ApplicationStatus.APPROVED_FINAL &&
            !application.actual_start_date;
    };

    const handleApprove = async () => {
        if (!selectedApplication) return;

        const actionText = approveAction === 'approve' ? 'duyệt' :
            approveAction === 'reject' ? 'từ chối' :
                'yêu cầu chỉnh sửa';

        const loadingMessage = message.loading({
            content: `⏳ Đang ${actionText} đơn ứng tuyển...`,
            duration: 0,
            key: 'approve-loading'
        });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/applications/approve', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    application_id: selectedApplication._id,
                    action: approveAction,
                    comment
                })
            });
            message.destroy('approve-loading');

            if (response.ok) {
                const successIcon = approveAction === 'approve' ? '✅' :
                    approveAction === 'reject' ? '❌' : '📝';

                message.success({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                {successIcon} Đã {actionText} đơn thành công!
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Sinh viên: {selectedApplication.student_id.username}
                                <br />
                                Vị trí: {selectedApplication.position_title}
                                {comment && (
                                    <>
                                        <br />
                                        Nhận xét: {comment.length > 30 ? comment.substring(0, 30) + '...' : comment}
                                    </>
                                )}
                            </div>
                        </div>
                    ),
                    duration: 4
                });
                setApproveModalVisible(false);
                setComment('');
                fetchApplications();
            } else {
                const data = await response.json();
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
        } catch (error) {
            message.destroy('approve-loading');
            console.error('Error approving application:', error);
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

    const handleStartInternship = async () => {
        if (!selectedApplication || !actualStartDate) return;
        const loadingMessage = message.loading({
            content: '🚀 Đang khởi tạo thực tập...',
            duration: 0,
            key: 'start-internship-loading'
        });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/applications/start-internship', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    application_id: selectedApplication._id,
                    actual_start_date: actualStartDate.format('YYYY-MM-DD')
                })
            });

            message.destroy('start-internship-loading');

            if (response.ok) {
                message.success({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                🎉 Đã bắt đầu thực tập thành công!
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                Sinh viên: {selectedApplication.student_id.username}
                                <br />
                                Vị trí: {selectedApplication.position_title}
                                <br />
                                Ngày bắt đầu: {actualStartDate.format('DD/MM/YYYY')}
                            </div>
                        </div>
                    ),
                    duration: 4
                });
                setStartInternshipModalVisible(false);
                setActualStartDate(null);
                fetchApplications();
            } else {
                const data = await response.json();
                message.error({
                    content: (
                        <div>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                ❌ Lỗi khi bắt đầu thực tập
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {data.message || 'Có lỗi xảy ra trong quá trình xử lý'}
                            </div>
                        </div>
                    ),
                    duration: 5
                });
            }
        } catch (error) {
            message.destroy('start-internship-loading');
            console.error('Error starting internship:', error);
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

    const columns = [
        {
            title: 'Mã sinh viên',
            dataIndex: ['student_id', 'student_code'],
            key: 'student_code',
            width: 120,
            render: (student_code: string, record: Application) => {
                return student_code || record.student_id.username;
            }
        },
        {
            title: 'Họ tên',
            dataIndex: ['student_id', 'full_name'],
            key: 'full_name',
            width: 200,
            render: (full_name: string) => full_name || '-',
        },
        {
            title: 'Lớp',
            dataIndex: ['student_id', 'class_name'],
            key: 'class_name',
            width: 120,
            render: (class_name: string) => class_name || '-',
        },
        {
            title: 'Số điện thoại',
            dataIndex: ['student_id', 'phone'],
            key: 'phone',
            width: 130,
            render: (phone: string) => phone || '-',
        },
        {
            title: 'Email',
            dataIndex: ['student_id', 'email'],
            key: 'email',
            width: 200,
        },
        {
            title: 'Đơn vị thực tập',
            dataIndex: ['unit_id', 'name'],
            key: 'unit_name',
            width: 200,
        },
        {
            title: 'Vị trí',
            dataIndex: 'position_title',
            key: 'position_title',
            width: 150,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            width: 150,
            render: (status: ApplicationStatus) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: 'Ngày nộp',
            dataIndex: 'application_date',
            key: 'application_date',
            width: 120,
            render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
        },
        {
            title: 'Người tạo',
            key: 'creator',
            width: 120,
            render: (record: Application) => {
                if (record.created_by_staff) {
                    return (
                        <span>
                            {record.created_by_staff.username}
                            <br />
                            <Tag color="blue">{record.created_by_staff.role}</Tag>
                        </span>
                    );
                }
                return <Tag color="green">Sinh viên</Tag>;
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 200,
            render: (record: Application) => (
                <Space>
                    <Button
                        type="link"
                        icon={<EyeOutlined />}
                        onClick={() => {
                            Modal.info({
                                title: 'Chi tiết đơn đăng ký',
                                width: 800,
                                content: (
                                    <div>
                                        <p><strong>Mã sinh viên:</strong> {record.student_id.student_code || record.student_id.username}</p>
                                        <p><strong>Họ tên:</strong> {record.student_id.full_name || '-'}</p>
                                        <p><strong>Lớp:</strong> {record.student_id.class_name || '-'}</p>
                                        <p><strong>Số điện thoại:</strong> {record.student_id.phone || '-'}</p>
                                        <p><strong>Email:</strong> {record.student_id.email}</p>
                                        <p><strong>Đơn vị:</strong> {record.unit_id.name}</p>
                                        <p><strong>Vị trí:</strong> {record.position_title}</p>
                                        <p><strong>Mô tả:</strong> {record.description}</p>
                                        <p><strong>Ngày dự kiến bắt đầu:</strong> {dayjs(record.expected_start_date).format('DD/MM/YYYY')}</p>
                                        <p><strong>Số giờ dự kiến:</strong> {record.expected_total_hours} giờ</p>
                                        {record.approved_by_l1 && (
                                            <p><strong>L1 duyệt:</strong> {record.approved_by_l1.username} - {dayjs(record.l1_approval_date).format('DD/MM/YYYY HH:mm')}</p>
                                        )}
                                        {record.comment_l1 && (
                                            <p><strong>Ghi chú L1:</strong> {record.comment_l1}</p>
                                        )}
                                        {record.approved_by_l2 && (
                                            <p><strong>L2 duyệt:</strong> {record.approved_by_l2.username} - {dayjs(record.l2_approval_date).format('DD/MM/YYYY HH:mm')}</p>
                                        )}
                                        {record.comment_l2 && (
                                            <p><strong>Ghi chú L2:</strong> {record.comment_l2}</p>
                                        )}
                                        {record.actual_start_date && (
                                            <p><strong>Ngày bắt đầu thực tế:</strong> {dayjs(record.actual_start_date).format('DD/MM/YYYY')}</p>
                                        )}
                                    </div>
                                ),
                            });
                        }}
                    >
                        Xem
                    </Button>

                    {canApprove(record) && (
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => {
                                setSelectedApplication(record);
                                setApproveAction('approve');
                                setApproveModalVisible(true);
                            }}
                        >
                            Duyệt
                        </Button>
                    )}

                    {canStartInternship(record) && (
                        <Button
                            type="primary"
                            icon={<PlayCircleOutlined />}
                            onClick={() => {
                                setSelectedApplication(record);
                                setStartInternshipModalVisible(true);
                            }}
                        >
                            Bắt đầu
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '24px' }}>
                <h1>
                    <FileTextOutlined /> Tất cả đơn đăng ký thực tập
                </h1>

                {/* Statistics */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                    <Col span={4}>
                        <Card>
                            <Statistic title="Tổng số đơn" value={stats.total} />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Đã nộp"
                                value={stats.submitted}
                                valueStyle={{ color: '#1890ff' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="L1 duyệt"
                                value={stats.approved_l1}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="L2 duyệt"
                                value={stats.approved_l2}
                                valueStyle={{ color: '#fa8c16' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Hoàn thành"
                                value={stats.approved_final}
                                valueStyle={{ color: '#52c41a' }}
                            />
                        </Card>
                    </Col>
                    <Col span={4}>
                        <Card>
                            <Statistic
                                title="Đang thực tập"
                                value={stats.active_internships}
                                valueStyle={{ color: '#13c2c2' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Filters */}
                <Space style={{ marginBottom: '16px' }}>
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        style={{ width: 200 }}
                        placeholder="Lọc theo trạng thái"
                    >
                        <Option value="all">Tất cả trạng thái</Option>
                        <Option value={ApplicationStatus.SUBMITTED}>Đã nộp</Option>
                        <Option value={ApplicationStatus.APPROVED_L1}>L1 đã duyệt</Option>
                        <Option value={ApplicationStatus.APPROVED_L2}>L2 đã duyệt</Option>
                        <Option value={ApplicationStatus.APPROVED_FINAL}>Hoàn thành</Option>
                        <Option value={ApplicationStatus.REJECTED_L1}>L1 từ chối</Option>
                        <Option value={ApplicationStatus.REJECTED_L2}>L2 từ chối</Option>
                    </Select>

                    <RangePicker
                        value={dateRange}
                        onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                        placeholder={['Từ ngày', 'Đến ngày']}
                    />

                    <Button onClick={() => {
                        setStatusFilter('all');
                        setDateRange(null);
                        setUnitFilter('all');
                    }}>
                        Xóa bộ lọc
                    </Button>
                </Space>
            </div>

            <Table
                columns={columns}
                dataSource={applications}
                rowKey="_id"
                loading={loading}
                pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} đơn`,
                }}
                scroll={{ x: 1200 }}
            />

            {/* Approve Modal */}
            <Modal
                title={`${approveAction === 'approve' ? 'Duyệt' : approveAction === 'reject' ? 'Từ chối' : 'Yêu cầu chỉnh sửa'} đơn đăng ký`}
                open={approveModalVisible}
                onOk={handleApprove}
                onCancel={() => {
                    setApproveModalVisible(false);
                    setComment('');
                }}
                okText={approveAction === 'approve' ? 'Duyệt' : approveAction === 'reject' ? 'Từ chối' : 'Yêu cầu sửa'}
                cancelText="Hủy"
            >
                <div style={{ marginBottom: '16px' }}>
                    <Space>
                        <Button
                            type={approveAction === 'approve' ? 'primary' : 'default'}
                            onClick={() => setApproveAction('approve')}
                        >
                            Duyệt
                        </Button>
                        <Button
                            type={approveAction === 'reject' ? 'primary' : 'default'}
                            onClick={() => setApproveAction('reject')}
                        >
                            Từ chối
                        </Button>
                        <Button
                            type={approveAction === 'request_revision' ? 'primary' : 'default'}
                            onClick={() => setApproveAction('request_revision')}
                        >
                            Yêu cầu sửa
                        </Button>
                    </Space>
                </div>

                <TextArea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ghi chú (không bắt buộc)"
                    rows={4}
                />
            </Modal>

            {/* Start Internship Modal */}
            <Modal
                title="Bắt đầu thực tập"
                open={startInternshipModalVisible}
                onOk={handleStartInternship}
                onCancel={() => {
                    setStartInternshipModalVisible(false);
                    setActualStartDate(null);
                }}
                okText="Bắt đầu"
                cancelText="Hủy"
            >
                <div>
                    <p>Sinh viên: {selectedApplication?.student_id.username}</p>
                    <p>Đơn vị: {selectedApplication?.unit_id.name}</p>
                    <p>Vị trí: {selectedApplication?.position_title}</p>

                    <div style={{ marginTop: '16px' }}>
                        <label>Ngày bắt đầu thực tế:</label>
                        <DatePicker
                            value={actualStartDate}
                            onChange={setActualStartDate}
                            style={{ width: '100%', marginTop: '8px' }}
                            placeholder="Chọn ngày bắt đầu"
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AllApplicationsPage;
