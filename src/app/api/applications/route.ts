import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../lib/database';
import User from '../../../models/User';
import Unit from '../../../models/Unit';
import InternshipApplication from '../../../models/InternshipApplication';
import { UserRole, ApplicationStatus } from '../../../types';

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

        // Kiểm tra quyền truy cập - L1, L2, Admin và Giám sát được xem đăng ký
        const allowedRoles = [UserRole.L1, UserRole.L2, UserRole.SUPERVISOR, UserRole.ADMIN];
        const hasPermission = Array.isArray(currentUser.role)
            ? currentUser.role.some(role => allowedRoles.includes(role))
            : allowedRoles.includes(currentUser.role);

        if (!hasPermission) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        // Lấy các tham số lọc từ query string
        const { searchParams } = new URL(request.url);
        const statusFilter = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const unitId = searchParams.get('unit_id');

        // Xây dựng query
        const query: any = {};

        if (statusFilter && statusFilter !== 'all') {
            query.status = statusFilter;
        }

        if (startDate && endDate) {
            query.expected_start_date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        if (unitId && unitId !== 'all') {
            query.unit_id = unitId;
        }

        // Đối với L2 user, chỉ cho phép xem applications của unit mình
        if (currentUser.role === UserRole.L2 ||
            (Array.isArray(currentUser.role) && currentUser.role.includes(UserRole.L2))) {
            if (currentUser.unit_id) {
                query.unit_id = currentUser.unit_id;
            } else {
                return NextResponse.json(
                    { success: false, message: 'Tài khoản L2 chưa được gán đơn vị' },
                    { status: 403 }
                );
            }
        }

        // Lấy tất cả đơn đăng ký với thông tin liên quan
        const applications = await InternshipApplication.find(query)
            .populate('student_id', 'username email full_name')
            .populate('unit_id', 'name location')
            .populate('approved_by_l1', 'username full_name')
            .populate('approved_by_l2', 'username full_name')
            .populate('created_by_staff', 'username full_name role')
            .sort({ created_at: -1 });

        // Add student_code from StudentProfile for each application
        const StudentProfile = (await import('../../../models/StudentProfile')).default;
        const applicationsWithStudentCode = await Promise.all(
            applications.map(async (app) => {
                const appObj = app.toObject();
                if (appObj.student_id && appObj.student_id._id) {
                    const studentProfile = await StudentProfile.findOne({ user_id: appObj.student_id._id }).select('student_code full_name class_name phone');
                    if (studentProfile) {
                        appObj.student_id.student_code = studentProfile.student_code;
                        appObj.student_id.full_name = studentProfile.full_name;
                        appObj.student_id.class_name = studentProfile.class_name;
                        appObj.student_id.phone = studentProfile.phone;
                    } else {
                        // Fallback to username if no student profile found
                        appObj.student_id.student_code = appObj.student_id.username;
                        appObj.student_id.full_name = appObj.student_id.full_name;
                    }
                }
                return appObj;
            })
        );

        return NextResponse.json({
            success: true,
            data: applicationsWithStudentCode
        });

    } catch (error: any) {
        console.error('Error fetching applications:', error);

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

export async function POST(request: NextRequest) {
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

        // Chỉ sinh viên mới có thể đăng ký
        if (currentUser.role !== UserRole.STUDENT) {
            return NextResponse.json(
                { success: false, message: 'Chỉ sinh viên mới có thể đăng ký thực tập' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const {
            unit_id,
            position_title,
            description,
            expected_start_date,
            expected_duration_months
        } = body;

        // Validate required fields
        if (!unit_id || !position_title || !description || !expected_start_date || !expected_duration_months) {
            return NextResponse.json(
                { success: false, message: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // Kiểm tra unit có tồn tại và active không
        const unit = await Unit.findById(unit_id);
        if (!unit || !unit.is_active) {
            return NextResponse.json(
                { success: false, message: 'Đơn vị thực tập không tồn tại hoặc không hoạt động' },
                { status: 400 }
            );
        }

        // Kiểm tra sinh viên đã có đơn đăng ký đang xử lý chưa
        const existingApplication = await InternshipApplication.findOne({
            student_id: currentUser._id,
            status: {
                $in: [
                    ApplicationStatus.SUBMITTED,
                    ApplicationStatus.APPROVED_L1,
                    ApplicationStatus.APPROVED_L2,
                    ApplicationStatus.REVISION_REQUESTED_L1,
                    ApplicationStatus.REVISION_REQUESTED_L2
                ]
            }
        });

        if (existingApplication) {
            return NextResponse.json(
                { success: false, message: 'Bạn đã có đơn đăng ký đang được xử lý. Vui lòng chờ kết quả hoặc hủy đơn hiện tại.' },
                { status: 400 }
            );
        }

        // Validate expected_duration_months
        const duration = parseInt(expected_duration_months);
        if (duration < 1 || duration > 12) {
            return NextResponse.json(
                { success: false, message: 'Thời gian thực tập phải từ 1-12 tháng' },
                { status: 400 }
            );
        }

        // Validate expected_start_date (không được trong quá khứ)
        const startDate = new Date(expected_start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (startDate < today) {
            return NextResponse.json(
                { success: false, message: 'Ngày bắt đầu không được là ngày trong quá khứ' },
                { status: 400 }
            );
        }

        // Tạo application mới
        const application = new InternshipApplication({
            student_id: currentUser._id,
            unit_id,
            position_title,
            description,
            expected_start_date: startDate,
            expected_duration_months: duration,
            status: ApplicationStatus.SUBMITTED,
            created_at: new Date(),
            updated_at: new Date()
        });

        await application.save();

        return NextResponse.json({
            success: true,
            message: 'Đăng ký thực tập thành công',
            data: application
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating application:', error);

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