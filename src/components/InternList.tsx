'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, message, Modal, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Intern } from '@/types';
import { internService } from '@/services/api';
import InternForm from './InternForm';

const { Title } = Typography;

const InternList: React.FC = () => {
    const [interns, setInterns] = useState<Intern[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingIntern, setEditingIntern] = useState<Intern | null>(null);

    const fetchInterns = async () => {
        setLoading(true);
        try {
            const data = await internService.getAllInterns();
            setInterns(data);
        } catch (error) {
            message.error('Không thể tải danh sách sinh viên thực tập');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterns();
    }, []);

    const handleDelete = async (id: string) => {
        Modal.confirm({
            title: 'Xác nhận xóa',
            content: 'Bạn có chắc chắn muốn xóa sinh viên thực tập này?',
            okText: 'Xóa',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await internService.deleteIntern(id);
                    message.success('Xóa sinh viên thực tập thành công');
                    fetchInterns();
                } catch (error) {
                    message.error('Không thể xóa sinh viên thực tập');
                }
            },
        });
    };

    const handleEdit = (intern: Intern) => {
        setEditingIntern(intern);
        setModalVisible(true);
    };

    const handleAdd = () => {
        setEditingIntern(null);
        setModalVisible(true);
    };

    const handleFormSubmit = () => {
        setModalVisible(false);
        fetchInterns();
        message.success(editingIntern ? 'Cập nhật sinh viên thành công' : 'Thêm sinh viên thành công');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'orange';
            case 'approved':
                return 'green';
            case 'rejected':
                return 'red';
            case 'in_progress':
                return 'blue';
            case 'completed':
                return 'purple';
            case 'cancelled':
                return 'gray';
            default:
                return 'default';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'Chờ duyệt';
            case 'approved':
                return 'Đã duyệt';
            case 'rejected':
                return 'Bị từ chối';
            case 'in_progress':
                return 'Đang thực tập';
            case 'completed':
                return 'Hoàn thành';
            case 'cancelled':
                return 'Hủy bỏ';
            default:
                return status;
        }
    };

    interface InternTableColumn {
        title: string;
        dataIndex?: string;
        key: string;
        sorter?: (a: Intern, b: Intern) => number;
        render?: (value: any, record: Intern) => React.ReactNode;
    }

    const columns: InternTableColumn[] = [
        {
            title: 'Đợt thực tập',
            dataIndex: 'internship_period',
            key: 'internship_period',
        },
        {
            title: 'Họ và tên',
            dataIndex: 'full_name',
            key: 'full_name',
            sorter: (a: Intern, b: Intern) => a.full_name.localeCompare(b.full_name),
        },
        {
            title: 'MSSV',
            dataIndex: 'student_id',
            key: 'student_id',
        },
        {
            title: 'Lớp',
            dataIndex: 'class_name',
            key: 'class_name',
        },
        {
            title: 'SĐT',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
        },
        {
            title: 'Vị trí',
            dataIndex: 'position',
            key: 'position',
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Tag color={getStatusColor(status)}>
                    {getStatusText(status)}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            key: 'actions',
            render: (_: any, record: Intern) => (
                <Space>
                    <Button
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(record)}
                        size="small"
                    >
                        Sửa
                    </Button>
                    <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleDelete(record._id)}
                        size="small"
                    >
                        Xóa
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Title level={2}>Quản lý sinh viên thực tập</Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={handleAdd}
                    size="large"
                >
                    Thêm sinh viên
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={interns}
                rowKey="_id"
                loading={loading}
                pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `Tổng cộng ${total} sinh viên`,
                }}
                scroll={{ x: 1200 }}
            />

            <Modal
                title={editingIntern ? 'Sửa thông tin sinh viên' : 'Thêm sinh viên mới'}
                open={modalVisible}
                onCancel={() => setModalVisible(false)}
                footer={null}
                width={800}
            >
                <InternForm
                    intern={editingIntern}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setModalVisible(false)}
                />
            </Modal>
        </div>
    );
};

export default InternList;
