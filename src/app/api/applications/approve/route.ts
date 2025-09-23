import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import InternshipApplication from '@/models/InternshipApplication';
import User from '@/models/User';
import jwt from 'jsonwebtoken';
import { UserRole, ApplicationStatus } from '@/types';

export async function PUT(request: NextRequest) {
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

        // Check if user has L1 approval permission
        const allowedRoles = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN];
        const hasPermission = Array.isArray(currentUser.role)
            ? currentUser.role.some(role => allowedRoles.includes(role))
            : allowedRoles.includes(currentUser.role);

        if (!hasPermission) {
            return NextResponse.json(
                { success: false, message: 'Bạn không có quyền duyệt đơn' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { application_id, action, comment } = body; // action: 'approve' | 'reject' | 'request_revision'

        if (!application_id || !action) {
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

        // Check current status and determine what user can do
        let canApproveL1 = false;
        let canApproveL2 = false;

        if (application.status === ApplicationStatus.SUBMITTED) {
            // Both L1 and L2 can approve from SUBMITTED
            const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
            canApproveL1 = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].some(role => userRoles.includes(role));
            canApproveL2 = [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].some(role => userRoles.includes(role));
        } else if (application.status === ApplicationStatus.APPROVED_L1) {
            // Only L2 can approve when L1 is already approved
            const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
            canApproveL2 = [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].some(role => userRoles.includes(role));
        } else if (application.status === ApplicationStatus.APPROVED_L2) {
            // Only L1 can approve when L2 is already approved  
            const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
            canApproveL1 = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].some(role => userRoles.includes(role));
        }

        if (!canApproveL1 && !canApproveL2) {
            return NextResponse.json(
                { success: false, message: 'Bạn không có quyền duyệt đơn này ở trạng thái hiện tại' },
                { status: 403 }
            );
        }

        let newStatus: ApplicationStatus | undefined;
        let updateData: any = {};

        if (action === 'approve') {
            if (application.status === ApplicationStatus.SUBMITTED) {
                // From SUBMITTED, can approve as L1 or L2
                const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];

                if (userRoles.includes(UserRole.L1) && !userRoles.includes(UserRole.L2)) {
                    // L1 approval from SUBMITTED (user has L1 but not L2)
                    newStatus = ApplicationStatus.APPROVED_L1;
                    updateData = {
                        status: newStatus,
                        approved_by_l1: currentUser._id,
                        l1_approval_date: new Date(),
                        comment_l1: comment || ''
                    };
                } else if (userRoles.some(role => [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].includes(role))) {
                    // L2 approval from SUBMITTED
                    newStatus = ApplicationStatus.APPROVED_L2;
                    updateData = {
                        status: newStatus,
                        approved_by_l2: currentUser._id,
                        l2_approval_date: new Date(),
                        comment_l2: comment || ''
                    };
                }
            } else if (application.status === ApplicationStatus.APPROVED_L1 && canApproveL2) {
                // Complete approval: L1 already approved, now L2 approves
                newStatus = ApplicationStatus.APPROVED_FINAL;
                updateData = {
                    status: newStatus,
                    approved_by_l2: currentUser._id,
                    l2_approval_date: new Date(),
                    comment_l2: comment || ''
                };
            } else if (application.status === ApplicationStatus.APPROVED_L2 && canApproveL1) {
                // Complete approval: L2 already approved, now L1 approves
                newStatus = ApplicationStatus.APPROVED_FINAL;
                updateData = {
                    status: newStatus,
                    approved_by_l1: currentUser._id,
                    l1_approval_date: new Date(),
                    comment_l1: comment || ''
                };
            }
        } else if (action === 'reject') {
            if (canApproveL1) {
                newStatus = ApplicationStatus.REJECTED_L1;
                updateData = {
                    status: newStatus,
                    comment_l1: comment || 'Đơn bị từ chối'
                };
            } else if (canApproveL2) {
                newStatus = ApplicationStatus.REJECTED_L2;
                updateData = {
                    status: newStatus,
                    comment_l2: comment || 'Đơn bị từ chối'
                };
            }
        } else if (action === 'request_revision') {
            if (canApproveL1) {
                newStatus = ApplicationStatus.REVISION_REQUESTED_L1;
                updateData = {
                    status: newStatus,
                    comment_l1: comment || 'Yêu cầu chỉnh sửa'
                };
            } else if (canApproveL2) {
                newStatus = ApplicationStatus.REVISION_REQUESTED_L2;
                updateData = {
                    status: newStatus,
                    comment_l2: comment || 'Yêu cầu chỉnh sửa'
                };
            }
        } else {
            return NextResponse.json(
                { success: false, message: 'Hành động không hợp lệ' },
                { status: 400 }
            );
        }

        if (!newStatus) {
            return NextResponse.json(
                { success: false, message: 'Không thể xác định trạng thái mới' },
                { status: 400 }
            );
        }

        // Update application
        await InternshipApplication.findByIdAndUpdate(application_id, updateData);

        return NextResponse.json({
            success: true,
            message: `Đã ${action === 'approve' ? 'duyệt' : action === 'reject' ? 'từ chối' : 'yêu cầu chỉnh sửa'} đơn thành công`,
            data: {
                application_id,
                new_status: newStatus,
                approved_by: currentUser._id,
                approver_role: currentUser.role
            }
        });

    } catch (error) {
        console.error('Error processing application approval:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' },
            { status: 500 }
        );
    }
}
