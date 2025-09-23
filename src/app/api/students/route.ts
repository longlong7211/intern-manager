import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../lib/database';
import User from '../../../models/User';
import StudentProfile from '../../../models/StudentProfile';
import InternshipApplication from '../../../models/InternshipApplication';
import Internship from '../../../models/Internship';
import { UserRole } from '../../../types';

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

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const status = searchParams.get('status');
        const search = searchParams.get('search');

        const skip = (page - 1) * limit;

        // Tạo filter cho tìm kiếm
        let userFilter: any = { role: UserRole.STUDENT };

        if (search) {
            userFilter.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Lấy danh sách user sinh viên
        const students = await User.find(userFilter)
            .select('_id full_name email created_at')
            .skip(skip)
            .limit(limit)
            .sort({ created_at: -1 });

        const total = await User.countDocuments(userFilter);

        // Lấy thông tin profile, applications và internships cho mỗi sinh viên
        const studentsWithDetails = await Promise.all(
            students.map(async (student) => {
                const profile = await StudentProfile.findOne({ user_id: student._id });

                const applications = await InternshipApplication.find({ student_id: student._id })
                    .populate('unit_id', 'name')
                    .sort({ created_at: -1 })
                    .limit(5);

                const internships = await Internship.find({ student_id: student._id })
                    .populate('unit_id', 'name')
                    .sort({ created_at: -1 })
                    .limit(5);

                return {
                    _id: student._id,
                    full_name: student.full_name,
                    email: student.email,
                    student_code: profile?.student_code,
                    major: profile?.major,
                    phone: profile?.phone,
                    applications: applications.map(app => ({
                        _id: app._id,
                        status: app.status,
                        unit_name: app.unit_id?.name || 'N/A',
                        position_title: app.position_title,
                        created_at: app.created_at
                    })),
                    internships: internships.map(intern => ({
                        _id: intern._id,
                        unit_name: intern.unit_id?.name || 'N/A',
                        status: intern.status,
                        start_date: intern.start_date,
                        total_hours_cached: intern.total_hours_cached || 0
                    }))
                };
            })
        );

        // Lọc theo trạng thái nếu có
        let filteredStudents = studentsWithDetails;
        if (status && status !== 'all') {
            filteredStudents = studentsWithDetails.filter(student => {
                if (status === 'ACTIVE') {
                    return student.internships.some(i => i.status === 'ACTIVE');
                }
                if (status === 'COMPLETED') {
                    return student.internships.some(i => i.status === 'COMPLETED');
                }
                if (status === 'SUBMITTED') {
                    return student.applications.some(a => a.status === 'SUBMITTED');
                }
                if (status === 'no_internship') {
                    return student.internships.length === 0 && student.applications.length === 0;
                }
                return true;
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                students: filteredStudents,
                pagination: {
                    current: page,
                    pageSize: limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error: any) {
        console.error('Error fetching students:', error);

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
