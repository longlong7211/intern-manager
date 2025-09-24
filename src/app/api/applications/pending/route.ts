import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../lib/database';
import User from '../../../../models/User';
import InternshipApplication from '../../../../models/InternshipApplication';
import { UserRole, ApplicationStatus } from '../../../../types';
import { hasAnyRole, hasRole } from '../../../../lib/auth';

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();

        const headersList = await headers();
        const authorization = headersList.get('authorization');

        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Kiểm tra quyền truy cập
        if (!hasAnyRole(currentUser.role, [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN])) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        // Xác định trạng thái đơn mà user có thể duyệt
        let statusFilter: ApplicationStatus[] = [];

        // L1 role: Duyệt đơn sơ bộ
        if (hasRole(currentUser.role, UserRole.L1)) {
            statusFilter = [
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.REVISION_REQUESTED_L1
            ];
        }

        // L2 role: Chấp nhận thực tập
        if (hasRole(currentUser.role, UserRole.L2)) {
            const l2Statuses = [
                ApplicationStatus.APPROVED_L1,
                ApplicationStatus.REVISION_REQUESTED_L2
            ];
            // Nếu user có cả L1 và L2, gộp cả hai
            statusFilter = [...new Set([...statusFilter, ...l2Statuses])];
        }

        // SUPERVISOR: Có thể xem tất cả
        if (hasRole(currentUser.role, UserRole.SUPERVISOR)) {
            statusFilter = [
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.APPROVED_L1,
                ApplicationStatus.APPROVED_L2,
                ApplicationStatus.REVISION_REQUESTED_L1,
                ApplicationStatus.REVISION_REQUESTED_L2
            ];
        }

        // ADMIN: Có thể xem tất cả
        if (hasRole(currentUser.role, UserRole.ADMIN)) {
            statusFilter = [
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.APPROVED_L1,
                ApplicationStatus.APPROVED_L2,
                ApplicationStatus.REVISION_REQUESTED_L1,
                ApplicationStatus.REVISION_REQUESTED_L2
            ];
        }

        // Lấy danh sách đơn chờ duyệt
        const query: any = {
            status: { $in: statusFilter }
        };

        // Đối với L2 user, chỉ cho phép xem applications của unit mình
        if (hasRole(currentUser.role, UserRole.L2) && !hasRole(currentUser.role, UserRole.ADMIN)) {
            if (currentUser.unit_id) {
                query.unit_id = currentUser.unit_id;
            } else {
                return NextResponse.json(
                    { success: false, message: 'Tài khoản L2 chưa được gán đơn vị' },
                    { status: 403 }
                );
            }
        }

        const applications = await InternshipApplication.find(query)
            .populate('student_id', 'full_name email')
            .populate('unit_id', 'name')
            .sort({ created_at: -1 });

        // Lấy thông tin student_code cho mỗi sinh viên
        const applicationsWithDetails = await Promise.all(
            applications.map(async (app) => {
                const StudentProfile = require('../../../../models/StudentProfile').default;
                const profile = await StudentProfile.findOne({ user_id: app.student_id?._id });

                return {
                    _id: app._id,
                    student_name: app.student_id?.full_name || 'N/A',
                    student_email: app.student_id?.email || 'N/A',
                    student_code: profile?.student_code || '',
                    unit_name: app.unit_id?.name || 'N/A',
                    position_title: app.position_title,
                    description: app.description,
                    status: app.status,
                    created_at: app.created_at,
                    l1_review_notes: app.l1_review_notes,
                    l2_review_notes: app.l2_review_notes,
                    supervisor_notes: app.supervisor_notes
                };
            })
        );

        return NextResponse.json({
            success: true,
            data: applicationsWithDetails
        });

    } catch (error: any) {
        console.error('Error fetching pending applications:', error);

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Lỗi server', error: error.message },
            { status: 500 }
        );
    }
}
