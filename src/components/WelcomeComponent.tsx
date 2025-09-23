'use client';

import { Card, Button, Row, Col, Typography } from 'antd';
import { UserOutlined, FormOutlined, LoginOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const { Title, Paragraph } = Typography;

const WelcomeComponent = () => {
    const router = useRouter();

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f0f2f5',
            padding: '40px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{ maxWidth: 1200, width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <Title level={1} style={{ color: '#1890ff' }}>
                        🎓 Hệ thống quản lý thực tập
                    </Title>
                    <Paragraph style={{ fontSize: 18, color: '#666' }}>
                        Nền tảng quản lý thực tập toàn diện cho sinh viên và đơn vị thực tập
                    </Paragraph>
                </div>

                <Row gutter={[32, 32]} justify="center">
                    <Col xs={24} sm={12} lg={8}>
                        <Card
                            hoverable
                            style={{ height: '100%' }}
                            cover={
                                <div style={{
                                    padding: 40,
                                    textAlign: 'center',
                                    backgroundColor: '#e6f7ff'
                                }}>
                                    <FormOutlined style={{ fontSize: 64, color: '#1890ff' }} />
                                </div>
                            }
                        >
                            <Card.Meta
                                title="Đăng ký thực tập"
                                description="Sinh viên có thể đăng ký thực tập trực tuyến một cách dễ dàng và nhanh chóng"
                            />
                            <div style={{ marginTop: 20, textAlign: 'center' }}>
                                <Button
                                    type="primary"
                                    size="large"
                                    onClick={() => router.push('/register')}
                                    style={{ width: '100%' }}
                                >
                                    Đăng ký ngay
                                </Button>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                        <Card
                            hoverable
                            style={{ height: '100%' }}
                            cover={
                                <div style={{
                                    padding: 40,
                                    textAlign: 'center',
                                    backgroundColor: '#f6ffed'
                                }}>
                                    <UserOutlined style={{ fontSize: 64, color: '#52c41a' }} />
                                </div>
                            }
                        >
                            <Card.Meta
                                title="Quản lý thông tin"
                                description="Theo dõi trạng thái đơn đăng ký, quản lý giờ thực tập và hồ sơ cá nhân"
                            />
                            <div style={{ marginTop: 20, textAlign: 'center' }}>
                                <Button
                                    size="large"
                                    onClick={() => router.push('/login')}
                                    style={{ width: '100%' }}
                                >
                                    Xem thông tin
                                </Button>
                            </div>
                        </Card>
                    </Col>

                    <Col xs={24} sm={12} lg={8}>
                        <Card
                            hoverable
                            style={{ height: '100%' }}
                            cover={
                                <div style={{
                                    padding: 40,
                                    textAlign: 'center',
                                    backgroundColor: '#fff7e6'
                                }}>
                                    <LoginOutlined style={{ fontSize: 64, color: '#fa8c16' }} />
                                </div>
                            }
                        >
                            <Card.Meta
                                title="Đăng nhập hệ thống"
                                description="Cán bộ quản lý và giám sát viên truy cập hệ thống để duyệt đơn và quản lý"
                            />
                            <div style={{ marginTop: 20, textAlign: 'center' }}>
                                <Button
                                    size="large"
                                    onClick={() => router.push('/login')}
                                    style={{ width: '100%' }}
                                >
                                    Đăng nhập
                                </Button>
                            </div>
                        </Card>
                    </Col>
                </Row>

                <div style={{ marginTop: 60 }}>
                    <Card>
                        <Title level={3} style={{ textAlign: 'center', marginBottom: 30 }}>
                            ✨ Tính năng nổi bật
                        </Title>
                        <Row gutter={[24, 24]}>
                            <Col xs={24} md={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 32,
                                        marginBottom: 12,
                                        color: '#1890ff'
                                    }}>📝</div>
                                    <Title level={5}>Đăng ký dễ dàng</Title>
                                    <Paragraph>
                                        Quy trình đăng ký thực tập đơn giản, tự động tạo tài khoản
                                    </Paragraph>
                                </div>
                            </Col>
                            <Col xs={24} md={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 32,
                                        marginBottom: 12,
                                        color: '#52c41a'
                                    }}>⚡</div>
                                    <Title level={5}>Duyệt nhanh chóng</Title>
                                    <Paragraph>
                                        Quy trình duyệt 2 bậc hiệu quả, thông báo kết quả tức thì
                                    </Paragraph>
                                </div>
                            </Col>
                            <Col xs={24} md={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 32,
                                        marginBottom: 12,
                                        color: '#fa8c16'
                                    }}>📊</div>
                                    <Title level={5}>Quản lý toàn diện</Title>
                                    <Paragraph>
                                        Theo dõi giờ thực tập, đánh giá kết quả và báo cáo chi tiết
                                    </Paragraph>
                                </div>
                            </Col>
                            <Col xs={24} md={6}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        fontSize: 32,
                                        marginBottom: 12,
                                        color: '#722ed1'
                                    }}>🔔</div>
                                    <Title level={5}>Thông báo thông minh</Title>
                                    <Paragraph>
                                        Cập nhật trạng thái real-time, thông báo qua email
                                    </Paragraph>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default WelcomeComponent;
