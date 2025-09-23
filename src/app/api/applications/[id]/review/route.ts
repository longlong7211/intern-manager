import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../../lib/database';
import User from '../../../../../models/User';
import InternshipApplication from '../../../../../models/InternshipApplication';
import Internship from '../../../../../models/Internship';
import { UserRole, ApplicationStatus, InternshipStatus } from '../../../../../types';
import { hasAnyRole, hasRole } from '../../../../../lib/auth';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const body = await request.json();
        const { action, notes } = body;

        if (!action || !notes) {
            return NextResponse.json(
                { success: false, message: 'Thiếu thông tin hành động hoặc ghi chú' },
                { status: 400 }
            );
        }

        // Tìm đơn đăng ký
        const application = await InternshipApplication.findById(params.id);
        if (!application) {
            return NextResponse.json(
                { success: false, message: 'Không tìm thấy đơn đăng ký' },
                { status: 404 }
            );
        }

        // Kiểm tra quyền duyệt theo role và trạng thái hiện tại
        let newStatus: ApplicationStatus;
        let updateField: string;

        switch (action) {
            case 'approve_l1':
                // Chỉ L1 và ADMIN có thể duyệt sơ bộ
                if (!hasAnyRole(currentUser.role, [UserRole.L1, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền duyệt L1' },
                        { status: 403 }
                    );
                }
                if (!['SUBMITTED', 'REVISION_REQUESTED_L1'].includes(application.status)) {
                    return NextResponse.json(
                        { success: false, message: 'Trạng thái đơn không phù hợp để duyệt L1' },
                        { status: 400 }
                    );
                }
                newStatus = ApplicationStatus.APPROVED_L1;
                updateField = 'l1_review_notes';
                break;

            case 'reject_l1':
                // Chỉ L1 và ADMIN có thể từ chối ở level L1
                if (!hasAnyRole(currentUser.role, [UserRole.L1, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền từ chối L1' },
                        { status: 403 }
                    );
                }
                newStatus = ApplicationStatus.REJECTED_L1;
                updateField = 'l1_review_notes';
                break;

            case 'request_revision_l1':
                // Chỉ L1 và ADMIN có thể yêu cầu chỉnh sửa ở level L1
                if (!hasAnyRole(currentUser.role, [UserRole.L1, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền yêu cầu sửa L1' },
                        { status: 403 }
                    );
                }
                newStatus = ApplicationStatus.REVISION_REQUESTED_L1;
                updateField = 'l1_review_notes';
                break;

            case 'approve_l2':
                // Chỉ L2 và ADMIN có thể chấp nhận thực tập
                if (!hasAnyRole(currentUser.role, [UserRole.L2, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền duyệt L2' },
                        { status: 403 }
                    );
                }
                if (!['APPROVED_L1', 'REVISION_REQUESTED_L2'].includes(application.status)) {
                    return NextResponse.json(
                        { success: false, message: 'Trạng thái đơn không phù hợp để duyệt L2' },
                        { status: 400 }
                    );
                }
                newStatus = ApplicationStatus.APPROVED_L2;
                updateField = 'l2_review_notes';
                break;

            case 'reject_l2':
                // Chỉ L2 và ADMIN có thể từ chối ở level L2
                if (!hasAnyRole(currentUser.role, [UserRole.L2, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền từ chối L2' },
                        { status: 403 }
                    );
                }
                newStatus = ApplicationStatus.REJECTED_L2;
                updateField = 'l2_review_notes';
                break;

            case 'request_revision_l2':
                // Chỉ L2 và ADMIN có thể yêu cầu chỉnh sửa ở level L2
                if (!hasAnyRole(currentUser.role, [UserRole.L2, UserRole.ADMIN])) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền yêu cầu sửa L2' },
                        { status: 403 }
                    );
                }
                newStatus = ApplicationStatus.REVISION_REQUESTED_L2;
                updateField = 'l2_review_notes';
                break;

            case 'approve_final':
                if (currentUser.role !== UserRole.SUPERVISOR && currentUser.role !== UserRole.ADMIN) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền duyệt cuối cùng' },
                        { status: 403 }
                    );
                }
                if (application.status !== 'APPROVED_L2') {
                    return NextResponse.json(
                        { success: false, message: 'Trạng thái đơn không phù hợp để duyệt cuối cùng' },
                        { status: 400 }
                    );
                }
                newStatus = ApplicationStatus.APPROVED_FINAL;
                updateField = 'supervisor_notes';
                break;

            case 'reject_final':
                if (currentUser.role !== UserRole.SUPERVISOR && currentUser.role !== UserRole.ADMIN) {
                    return NextResponse.json(
                        { success: false, message: 'Không có quyền từ chối cuối cùng' },
                        { status: 403 }
                    );
                }
                newStatus = ApplicationStatus.REJECTED_L2; // Đưa về trạng thái reject L2
                updateField = 'supervisor_notes';
                break;

            default:
                return NextResponse.json(
                    { success: false, message: 'Hành động không hợp lệ' },
                    { status: 400 }
                );
        }

        // Cập nhật đơn đăng ký
        const updateData: any = {
            status: newStatus,
            [updateField]: notes,
            updated_at: new Date()
        };

        await InternshipApplication.findByIdAndUpdate(params.id, updateData);

        // Nếu đơn được duyệt cuối cùng, tạo internship
        if (newStatus === ApplicationStatus.APPROVED_FINAL) {
            const existingInternship = await Internship.findOne({
                student_id: application.student_id,
                status: { $in: ['ACTIVE', 'COMPLETED'] }
            });

            if (!existingInternship) {
                const internship = new Internship({
                    student_id: application.student_id,
                    unit_id: application.unit_id,
                    position_title: application.position_title,
                    description: application.description,
                    start_date: new Date(),
                    status: InternshipStatus.ACTIVE,
                    total_hours_cached: 0,
                    created_at: new Date(),
                    updated_at: new Date()
                });

                await internship.save();
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Duyệt đơn thành công',
            data: {
                id: params.id,
                status: newStatus,
                notes
            }
        });

    } catch (error: any) {
        console.error('Error reviewing application:', error);

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
