'use client';

import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, Modal, Form, message, Spin } from 'antd';
import { SearchOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, InternshipStatus, ApplicationStatus } from '../types';

const { Option } = Select;

interface Student {
    _id: string;
    full_name: string;
    email: string;
    student_code?: string;
    major?: string;
    phone?: string;
    internships?: Array<{
        _id: string;
        unit_name: string;
        status: InternshipStatus;
        start_date: string;
        total_hours_cached: number;
    }>;
    applications?: Array<{
        _id: string;
        status: ApplicationStatus;
        unit_name: string;
        position_title?: string;
    }>;
}

const StudentList: React.FC = () => {
    const { user } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });

    useEffect(() => {
        fetchStudents();
    }, [pagination.current, pagination.pageSize, statusFilter]);

    const fetchStudents = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            const params = new URLSearchParams({
                page: pagination.current.toString(),
                limit: pagination.pageSize.toString(),
            });

            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const response = await fetch(`/api/students?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    setStudents(data.data.students || []);
                    setPagination(prev => ({
                        ...prev,
                        total: data.data.pagination?.total || 0
                    }));
                }
            } else {
                message.error('Không thể tải danh sách sinh viên');
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            message.error('Lỗi khi tải danh sách sinh viên');
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'green';
            case 'COMPLETED': return 'blue';
            case 'TERMINATION_REQUESTED': return 'orange';
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

    const getStatusText = (status: string) => {
        switch (status) {
            case 'ACTIVE': return 'Đang thực tập';
            case 'COMPLETED': return 'Hoàn thành';
            case 'TERMINATION_REQUESTED': return 'Yêu cầu kết thúc';
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

    const columns = [
        {
            title: 'Mã SV',
            dataIndex: 'student_code',
            key: 'student_code',
            width: 100,
        },
        {
            title: 'Họ và tên',
            dataIndex: 'full_name',
            key: 'full_name',
            filteredValue: searchText ? [searchText] : null,
            onFilter: (value: any, record: Student): boolean =>
                record.full_name.toLowerCase().includes(value.toLowerCase()) ||
                record.email.toLowerCase().includes(value.toLowerCase()) ||
                Boolean(record.student_code && record.student_code.toLowerCase().includes(value.toLowerCase())),
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Ngành',
            dataIndex: 'major',
            key: 'major',
        },
        {
            title: 'Số điện thoại',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Trạng thái thực tập',
            key: 'internship_status',
            render: (record: Student) => {
                const activeInternship = record.internships?.find(i => i.status === 'ACTIVE');
                if (activeInternship) {
                    return (
                        <div>
                            <Tag color={getStatusColor(activeInternship.status)}>
                                {getStatusText(activeInternship.status)}
                            </Tag>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {activeInternship.unit_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {activeInternship.total_hours_cached} giờ
                            </div>
                        </div>
                    );
                }

                const latestApplication = record.applications?.[0];
                if (latestApplication) {
                    return (
                        <div>
                            <Tag color={getStatusColor(latestApplication.status)}>
                                {getStatusText(latestApplication.status)}
                            </Tag>
                            <div style={{ fontSize: '12px', color: '#666' }}>
                                {latestApplication.unit_name}
                            </div>
                        </div>
                    );
                }

                return <Tag color="default">Chưa đăng ký</Tag>;
            },
        },
        {
            title: 'Thao tác',
            key: 'actions',
            render: (record: Student) => (
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => viewStudentDetail(record)}
                    >
                        Chi tiết
                    </Button>
                    {(user?.role === UserRole.L1 || user?.role === UserRole.L2) && (
                        <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => editStudent(record)}
                        >
                            Sửa
                        </Button>
                    )}
                </Space>
            ),
        },
    ];

    const viewStudentDetail = (student: Student) => {
        Modal.info({
            title: `Chi tiết sinh viên: ${student.full_name}`,
            width: 600,
            content: (
                <div style={{ marginTop: 16 }}>
                    <p><strong>Mã sinh viên:</strong> {student.student_code}</p>
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>Ngành:</strong> {student.major}</p>
                    <p><strong>Số điện thoại:</strong> {student.phone}</p>

                    {student.internships && student.internships.length > 0 && (
                        <div>
                            <h4>Lịch sử thực tập:</h4>
                            {student.internships.map(internship => (
                                <div key={internship._id} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                                    <p><strong>Đơn vị:</strong> {internship.unit_name}</p>
                                    <p><strong>Trạng thái:</strong> <Tag color={getStatusColor(internship.status)}>{getStatusText(internship.status)}</Tag></p>
                                    <p><strong>Ngày bắt đầu:</strong> {new Date(internship.start_date).toLocaleDateString('vi-VN')}</p>
                                    <p><strong>Tổng giờ:</strong> {internship.total_hours_cached} giờ</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {student.applications && student.applications.length > 0 && (
                        <div>
                            <h4>Lịch sử đăng ký:</h4>
                            {student.applications.map(application => (
                                <div key={application._id} style={{ marginBottom: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
                                    <p><strong>Đơn vị:</strong> {application.unit_name}</p>
                                    <p><strong>Vị trí:</strong> {application.position_title}</p>
                                    <p><strong>Trạng thái:</strong> <Tag color={getStatusColor(application.status)}>{getStatusText(application.status)}</Tag></p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ),
        });
    };

    const editStudent = (student: Student) => {
        // TODO: Implement edit functionality
        message.info('Tính năng chỉnh sửa đang được phát triển');
    };

    const filteredStudents = students.filter(student =>
        !searchText ||
        student.full_name.toLowerCase().includes(searchText.toLowerCase()) ||
        student.email.toLowerCase().includes(searchText.toLowerCase()) ||
        (student.student_code && student.student_code.toLowerCase().includes(searchText.toLowerCase()))
    );

    return (
        <Card title="Danh sách sinh viên thực tập" style={{ margin: '0 auto' }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Input
                    placeholder="Tìm kiếm theo tên, email, mã sinh viên..."
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 300 }}
                />

                <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 200 }}
                >
                    <Option value="all">Tất cả trạng thái</Option>
                    <Option value="ACTIVE">Đang thực tập</Option>
                    <Option value="COMPLETED">Hoàn thành</Option>
                    <Option value="SUBMITTED">Đã nộp đơn</Option>
                    <Option value="no_internship">Chưa thực tập</Option>
                </Select>

                <Button onClick={fetchStudents}>
                    Làm mới
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={filteredStudents}
                rowKey="_id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} sinh viên`,
                    onChange: (page, pageSize) => {
                        setPagination(prev => ({
                            ...prev,
                            current: page,
                            pageSize: pageSize || 10
                        }));
                    }
                }}
                scroll={{ x: 1200 }}
            />
        </Card>
    );
};

export default StudentList;
