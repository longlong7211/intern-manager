'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, Alert, Typography, Layout, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

const { Title } = Typography;
const { Content } = Layout;

interface LoginFormData {
    username: string;
    password: string;
}

const LoginPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();
    const router = useRouter();

    const onFinish = async (values: LoginFormData) => {
        const loginMessageKey = 'login-loading';
        message.loading({
            content: '🔐 Đang xác thực thông tin đăng nhập...',
            duration: 0,
            key: loginMessageKey
        });

        try {
            setLoading(true);
            setError(null);
            await login(values.username, values.password);

            message.destroy(loginMessageKey);
            message.success({
                content: (
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            🎉 Đăng nhập thành công!
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            Đang chuyển hướng đến trang quản lý...
                        </div>
                    </div>
                ),
                duration: 3
            });

            // Small delay for better UX
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);
        } catch (error) {
            message.destroy(loginMessageKey);
            const errorMessage = (error as Error).message;

            message.error({
                content: (
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                            ❌ Đăng nhập thất bại
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            {errorMessage.includes('connection') || errorMessage.includes('network')
                                ? 'Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.'
                                : errorMessage.includes('Invalid') || errorMessage.includes('incorrect')
                                    ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
                                    : `Lỗi: ${errorMessage}`
                            }
                        </div>
                    </div>
                ),
                duration: 5
            });
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout style={{ minHeight: '100vh', backgroundColor: '#f0f2f5' }}>
            <Content style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px'
            }}>
                <Card
                    style={{
                        width: '100%',
                        maxWidth: 400,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Title level={2} style={{ color: '#1890ff' }}>
                            🎓 Đăng nhập hệ thống
                        </Title>
                        <p style={{ color: '#666' }}>
                            Đăng nhập để quản lý thực tập
                        </p>
                    </div>

                    {error && (
                        <Alert
                            message={error}
                            type="error"
                            showIcon
                            style={{ marginBottom: 16 }}
                        />
                    )}

                    <Form
                        name="login"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                    >
                        <Form.Item
                            name="username"
                            label="Tên đăng nhập"
                            rules={[
                                { required: true, message: 'Vui lòng nhập tên đăng nhập!' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined />}
                                placeholder="Mã sinh viên hoặc email"
                            />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            label="Mật khẩu"
                            rules={[
                                { required: true, message: 'Vui lòng nhập mật khẩu!' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined />}
                                placeholder="Mật khẩu"
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                style={{ width: '100%' }}
                            >
                                Đăng nhập
                            </Button>
                        </Form.Item>
                    </Form>

                    <div style={{
                        textAlign: 'center',
                        marginTop: 16,
                        padding: 16,
                        backgroundColor: '#f6ffed',
                        borderRadius: 6,
                        border: '1px solid #b7eb8f'
                    }}>
                        <p style={{ margin: 0, color: '#389e0d' }}>
                            <strong>Sinh viên mới:</strong>
                            <br />
                            Đăng ký thực tập để tự động tạo tài khoản
                            <br />
                            <Button
                                type="link"
                                onClick={() => router.push('/register')}
                                style={{ padding: 0, marginTop: 8 }}
                            >
                                👉 Đăng ký thực tập ngay
                            </Button>
                        </p>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        marginTop: 16
                    }}>
                        <Button
                            type="link"
                            onClick={() => router.push('/')}
                        >
                            ← Quay lại trang chủ
                        </Button>
                    </div>
                </Card>
            </Content>
        </Layout>
    );
};

export default LoginPage;
