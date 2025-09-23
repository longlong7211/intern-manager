import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import Unit from '@/models/Unit';
import InternshipApplication from '@/models/InternshipApplication';
import StudentProfile from '@/models/StudentProfile';
import bcrypt from 'bcryptjs';
import { UserRole, INTERNSHIP_CONSTANTS, ApplicationStatus } from '@/types';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        // Verify staff authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        let staffUser;

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
            staffUser = await User.findById(decoded.userId);

            const allowedRoles = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN];

            if (!staffUser) {
                return NextResponse.json(
                    { success: false, message: 'Người dùng không tồn tại' },
                    { status: 401 }
                );
            }

            const hasPermission = Array.isArray(staffUser.role)
                ? staffUser.role.some(role => allowedRoles.includes(role))
                : allowedRoles.includes(staffUser.role);

            if (!hasPermission) {
                return NextResponse.json(
                    { success: false, message: 'Không có quyền thực hiện thao tác này' },
                    { status: 403 }
                );
            }
        } catch (error) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            // Thông tin sinh viên
            full_name,
            email,
            student_code,
            major,
            phone,
            class_name,
            // Thông tin đăng ký thực tập
            unit_id,
            position_title,
            description,
            expected_start_date,
            expected_total_hours
        } = body;

        // Validate required fields
        if (!full_name || !email || !student_code || !major || !phone || !class_name ||
            !unit_id || !position_title || !expected_start_date || !expected_total_hours) {
            return NextResponse.json(
                { success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, message: 'Email không đúng định dạng' },
                { status: 400 }
            );
        }

        // Validate student code format
        const studentCodeRegex = /^[A-Z0-9]+$/;
        if (!studentCodeRegex.test(student_code)) {
            return NextResponse.json(
                { success: false, message: 'Mã sinh viên chỉ được chứa chữ hoa và số' },
                { status: 400 }
            );
        }

        // Validate phone format
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(phone)) {
            return NextResponse.json(
                { success: false, message: 'Số điện thoại phải có 10-11 chữ số' },
                { status: 400 }
            );
        }

        // Validate expected total hours
        if (expected_total_hours < 100 || expected_total_hours > 2000) {
            return NextResponse.json(
                { success: false, message: 'Tổng số giờ thực tập phải từ 100-2000 giờ' },
                { status: 400 }
            );
        }

        // Validate description length (optional)
        if (description && description.length > 0 && description.length < 20) {
            return NextResponse.json(
                { success: false, message: 'Mô tả nếu có phải có ít nhất 20 ký tự' },
                { status: 400 }
            );
        }

        // Validate start date
        const startDate = new Date(expected_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
            return NextResponse.json(
                { success: false, message: 'Ngày bắt đầu không thể là quá khứ' },
                { status: 400 }
            );
        }

        // Check if unit exists and is active
        const unit = await Unit.findById(unit_id);
        if (!unit || !unit.is_active) {
            return NextResponse.json(
                { success: false, message: 'Đơn vị thực tập không tồn tại hoặc đã ngừng hoạt động' },
                { status: 400 }
            );
        }

        // Check if student already exists
        let user = await User.findOne({ username: student_code });
        let studentProfile;

        if (user) {
            // Check if it's the same student by comparing email
            studentProfile = await StudentProfile.findOne({ user_id: user._id });
            if (studentProfile && studentProfile.email !== email) {
                return NextResponse.json(
                    { success: false, message: 'Mã sinh viên đã được sử dụng bởi sinh viên khác' },
                    { status: 400 }
                );
            }

            // Update existing student info if needed
            if (studentProfile) {
                await StudentProfile.findByIdAndUpdate(studentProfile._id, {
                    full_name,
                    email,
                    major,
                    phone,
                    class_name
                });
            }
        } else {
            // Create new user account
            const hashedPassword = await bcrypt.hash('svlhu@2025', 10);

            user = new User({
                email,
                username: student_code,
                password_hash: hashedPassword,
                full_name,
                role: UserRole.STUDENT,
                status: 'active'
            });
            await user.save();

            // Create student profile
            studentProfile = new StudentProfile({
                user_id: user._id,
                student_code,
                full_name,
                email,
                major,
                phone,
                class_name
            });
            await studentProfile.save();
        }

        // Check if student already has a pending application
        const existingApplication = await InternshipApplication.findOne({
            student_id: user._id,
            status: { $in: [ApplicationStatus.SUBMITTED, ApplicationStatus.APPROVED_L1] }
        });

        if (existingApplication) {
            return NextResponse.json(
                { success: false, message: 'Sinh viên đã có đơn đăng ký thực tập đang chờ duyệt.' },
                { status: 400 }
            );
        }

        // Determine application status based on staff role
        const userRoles = Array.isArray(staffUser.role) ? staffUser.role : [staffUser.role];
        let applicationStatus = ApplicationStatus.SUBMITTED;

        if (userRoles.includes(UserRole.L1)) {
            // L1 creates application with L1 approval, needs L2 approval
            applicationStatus = ApplicationStatus.APPROVED_L1;
        } else if (userRoles.some((role: UserRole) => [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].includes(role))) {
            // L2/SUPERVISOR/ADMIN creates application with L2 approval, needs L1 approval
            applicationStatus = ApplicationStatus.APPROVED_L2;
        }
        // Other roles create applications that start at SUBMITTED

        // Create internship application
        const application = new InternshipApplication({
            student_id: user._id,
            status: applicationStatus,
            // Track who created this application
            created_by_staff: staffUser._id,
            approved_by_l1: userRoles.includes(UserRole.L1) ? staffUser._id : null,
            approved_by_l2: userRoles.some((role: UserRole) => [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].includes(role)) ? staffUser._id : null,
            l1_approval_date: userRoles.includes(UserRole.L1) ? new Date() : null,
            l2_approval_date: userRoles.some((role: UserRole) => [UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN].includes(role)) ? new Date() : null,
            application_date: new Date(),
        });

        await application.save();

        return NextResponse.json({
            success: true,
            message: `Đăng ký thực tập cho sinh viên thành công! Trạng thái: ${applicationStatus}`,
            data: {
                application_id: application._id,
                student_code,
                status: applicationStatus,
                created_by: staffUser.role
            }
        });

    } catch (error) {
        console.error('Error creating internship application by staff:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' },
            { status: 500 }
        );
    }
}
