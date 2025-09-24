import { AntdRegistry } from '@ant-design/nextjs-registry';
import { AuthProvider } from '../contexts/AuthContext';
import './globals.css';

export const metadata = {
    title: 'Hệ thống quản lý thực tập',
    description: 'Hệ thống quản lý thực tập sinh với quy trình duyệt 2 bậc',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="vi">
            <body suppressHydrationWarning={true}>
                <AntdRegistry>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </AntdRegistry>
            </body>
        </html>
    );
}
