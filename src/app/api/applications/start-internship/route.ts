import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import InternshipApplication from '@/models/InternshipApplication';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { UserRole, ApplicationStatus, InternshipStatus } from '@/types';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        // Get auth token
        const token = request.headers.get('authorization')?.replace('Bearer ', '');
        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        // Verify token and get user
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        const currentUser = await User.findById(decoded.id);

        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Check if user has permission to start internship
        const allowedRoles = [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN];
        const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        if (!userRoles.some(role => allowedRoles.includes(role))) {
            return NextResponse.json(
                { success: false, message: 'Bạn không có quyền bắt đầu thực tập' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { application_id, actual_start_date } = body;

        if (!application_id || !actual_start_date) {
            return NextResponse.json(
                { success: false, message: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        const application = await InternshipApplication.findById(application_id);
        if (!application) {
            return NextResponse.json(
                { success: false, message: 'Đơn đăng ký không tồn tại' },
                { status: 404 }
            );
        }

        // Check if application is approved by both L1 and L2
        if (application.status !== ApplicationStatus.APPROVED_FINAL) {
            return NextResponse.json(
                { success: false, message: 'Đơn đăng ký chưa được duyệt đầy đủ (cần cả L1 và L2)' },
                { status: 400 }
            );
        }

        // Validate start date
        const startDate = new Date(actual_start_date);
        if (isNaN(startDate.getTime())) {
            return NextResponse.json(
                { success: false, message: 'Ngày bắt đầu không hợp lệ' },
                { status: 400 }
            );
        }

        // Update application to start internship
        const updateData = {
            actual_start_date: startDate,
            internship_status: InternshipStatus.ACTIVE,
            internship_started_by: currentUser._id,
            internship_start_date: new Date()
        };

        await InternshipApplication.findByIdAndUpdate(application_id, updateData);

        return NextResponse.json({
            success: true,
            message: 'Đã bắt đầu thực tập thành công',
            data: {
                application_id,
                status: ApplicationStatus.APPROVED_FINAL,
                internship_status: InternshipStatus.ACTIVE,
                actual_start_date: startDate,
                started_by: currentUser._id
            }
        });

    } catch (error) {
        console.error('Error starting internship:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' },
            { status: 500 }
        );
    }
}
