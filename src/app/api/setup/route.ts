import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import User from '../../../models/User';
import Unit from '../../../models/Unit';
import StudentProfile from '../../../models/StudentProfile';
import { authUtils } from '../../../lib/auth';
import { ApiResponse } from '../../../lib/middleware';
import { UserRole } from '../../../types';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        // Create sample units
        const units = [
            {
                name: 'Công ty TNHH Công nghệ ABC',
                address: '123 Đường Lê Lợi, Quận 1, TP.HCM',
                contact_person: 'Nguyễn Văn A',
                contact_email: 'contact@abc-tech.com',
                contact_phone: '0901234567',
                description: 'Công ty chuyên phát triển phần mềm và ứng dụng di động',
                is_active: true
            },
            {
                name: 'Ngân hàng XYZ',
                address: '456 Đường Nguyễn Huệ, Quận 1, TP.HCM',
                contact_person: 'Trần Thị B',
                contact_email: 'hr@xyz-bank.com',
                contact_phone: '0902345678',
                description: 'Ngân hàng thương mại cổ phần hàng đầu Việt Nam',
                is_active: true
            },
            {
                name: 'Tập đoàn Viễn thông DEF',
                address: '789 Đường Trần Hưng Đạo, Quận 5, TP.HCM',
                contact_person: 'Lê Văn C',
                contact_email: 'recruitment@def-telecom.com',
                contact_phone: '0903456789',
                description: 'Tập đoàn viễn thông và công nghệ thông tin',
                is_active: true
            }
        ];

        const createdUnits = [];
        for (const unitData of units) {
            const existingUnit = await Unit.findOne({ name: unitData.name });
            if (!existingUnit) {
                const unit = new Unit(unitData);
                await unit.save();
                createdUnits.push(unit);
            }
        }

        // Create sample users
        const users: Array<{
            email: string;
            password: string;
            full_name: string;
            role: UserRole;
            student_code?: string;
            major?: string;
            unit_id?: any;
        }> = [
                {
                    email: 'admin@system.com',
                    password: 'Admin123!',
                    full_name: 'Quản trị viên hệ thống',
                    role: UserRole.ADMIN
                },
                {
                    email: 'l1@school.edu.vn',
                    password: 'L1Manager123!',
                    full_name: 'Phạm Thị Quản lý L1',
                    role: UserRole.L1
                },
                {
                    email: 'supervisor@school.edu.vn',
                    password: 'Supervisor123!',
                    full_name: 'Nguyễn Văn Giám sát',
                    role: UserRole.SUPERVISOR
                },
                {
                    email: 'student1@school.edu.vn',
                    password: 'Student123!',
                    full_name: 'Nguyễn Văn An',
                    role: UserRole.STUDENT,
                    student_code: 'SV001',
                    major: 'Công nghệ thông tin'
                },
                {
                    email: 'student2@school.edu.vn',
                    password: 'Student123!',
                    full_name: 'Trần Thị Bình',
                    role: UserRole.STUDENT,
                    student_code: 'SV002',
                    major: 'Khoa học máy tính'
                }
            ];

        // Add L2 users for each unit
        if (createdUnits.length > 0) {
            users.push({
                email: 'l2.abc@company.com',
                password: 'L2Manager123!',
                full_name: 'Võ Thị Quản lý ABC',
                role: UserRole.L2,
                unit_id: createdUnits[0]._id
            });

            if (createdUnits.length > 1) {
                users.push({
                    email: 'l2.xyz@bank.com',
                    password: 'L2Manager123!',
                    full_name: 'Hoàng Văn Quản lý XYZ',
                    role: UserRole.L2,
                    unit_id: createdUnits[1]._id
                });
            }
        }

        const createdUsers = [];
        for (const userData of users) {
            const existingUser = await User.findOne({ email: userData.email });
            if (!existingUser) {
                const hashedPassword = await authUtils.hashPassword(userData.password);

                const user = new User({
                    email: userData.email,
                    password_hash: hashedPassword,
                    full_name: userData.full_name,
                    role: userData.role,
                    unit_id: userData.unit_id || undefined,
                    status: 'active'
                });

                await user.save();
                createdUsers.push(user);

                // Create student profile if user is a student
                if (userData.role === UserRole.STUDENT) {
                    const studentProfile = new StudentProfile({
                        user_id: user._id,
                        student_code: userData.student_code,
                        major: userData.major,
                        phone: '0901234567'
                    });
                    await studentProfile.save();
                }
            }
        }

        return Response.json(ApiResponse.success({
            units: createdUnits.length,
            users: createdUsers.length,
            message: 'Sample data created successfully'
        }), { status: 201 });

    } catch (error) {
        console.error('Create sample data error:', error);
        return ApiResponse.serverError('Failed to create sample data');
    }
}
