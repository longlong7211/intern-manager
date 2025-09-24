import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../lib/database';
import User from '../../../models/User';
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

        // Check user permissions
        const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const canViewAllUsers = userRoles.some(role =>
            [UserRole.ADMIN, UserRole.L1, UserRole.SUPERVISOR].includes(role)
        );
        const isL2 = userRoles.includes(UserRole.L2);

        if (!canViewAllUsers && !isL2) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const roleFilter = searchParams.get('role');
        const unitIdFilter = searchParams.get('unit_id');
        const searchQuery = searchParams.get('search');

        let query: any = {};

        // L2 can only see students and other L2s in their unit
        if (isL2 && !canViewAllUsers) {
            if (!currentUser.unit_id) {
                return NextResponse.json(
                    { success: false, message: 'Tài khoản L2 phải thuộc một đơn vị' },
                    { status: 403 }
                );
            }

            query = {
                $or: [
                    { role: UserRole.STUDENT },
                    {
                        role: UserRole.L2,
                        unit_id: currentUser.unit_id
                    }
                ]
            };
        }

        // Apply filters for admins/supervisors/L1
        if (canViewAllUsers) {
            if (roleFilter) {
                query.role = roleFilter;
            }
            if (unitIdFilter) {
                query.unit_id = unitIdFilter;
            }
        }

        // Apply search filter
        if (searchQuery) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { full_name: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } },
                    { username: { $regex: searchQuery, $options: 'i' } }
                ]
            });
        }

        // Get users based on permissions
        const users = await User.find(query)
            .select('-password_hash')
            .sort({ created_at: -1 });

        console.log('Found users count:', users.length);
        console.log('Current user role:', currentUser.role);

        return NextResponse.json({
            success: true,
            data: users
        });

    } catch (error: any) {
        console.error('Error fetching users:', error);

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

        const body = await request.json();
        const { username, email, full_name, role, status, password, unit_id } = body;

        console.log('Received request body:', body);
        console.log('Extracted fields:', { username, email, full_name, role, status, password: password ? '***' : undefined, unit_id });

        // Check user creation permissions
        const userRoles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
        const canCreateAllRoles = userRoles.some(role =>
            [UserRole.ADMIN, UserRole.L1].includes(role)
        );
        const isL2 = userRoles.includes(UserRole.L2);

        // Validate role creation permissions
        const rolesToCreate = Array.isArray(role) ? role : [role];

        if (canCreateAllRoles) {
            // Admin and L1 can create L2, L1, SUPERVISOR (but not ADMIN unless current user is ADMIN)
            const canCreateAdmin = userRoles.includes(UserRole.ADMIN);
            if (rolesToCreate.includes(UserRole.ADMIN) && !canCreateAdmin) {
                return NextResponse.json(
                    { success: false, message: 'Chỉ Admin mới có thể tạo tài khoản Admin' },
                    { status: 403 }
                );
            }

            const allowedRoles = canCreateAdmin
                ? [UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.L1, UserRole.L2, UserRole.STUDENT]
                : [UserRole.SUPERVISOR, UserRole.L1, UserRole.L2, UserRole.STUDENT];

            const invalidRoles = rolesToCreate.filter((r: UserRole) => !allowedRoles.includes(r));
            if (invalidRoles.length > 0) {
                return NextResponse.json(
                    { success: false, message: `Không có quyền tạo vai trò: ${invalidRoles.join(', ')}` },
                    { status: 403 }
                );
            }
        } else if (isL2) {
            // L2 can only create other L2s in their unit
            if (!currentUser.unit_id) {
                return NextResponse.json(
                    { success: false, message: 'Tài khoản L2 phải thuộc một đơn vị để tạo user mới' },
                    { status: 403 }
                );
            }

            const invalidRoles = rolesToCreate.filter((r: UserRole) => r !== UserRole.L2);
            if (invalidRoles.length > 0) {
                return NextResponse.json(
                    { success: false, message: 'L2 chỉ có thể tạo tài khoản L2 thuộc đơn vị' },
                    { status: 403 }
                );
            }
        } else {
            return NextResponse.json(
                { success: false, message: 'Không có quyền tạo người dùng' },
                { status: 403 }
            );
        }

        // Validate required fields
        console.log('Validating required fields...');
        console.log('username:', username, 'email:', email, 'full_name:', full_name, 'role:', role, 'status:', status, 'password:', password ? '***' : undefined);

        if (!username || !email || !full_name || !role || (Array.isArray(role) && role.length === 0) || !status || !password) {
            const missingFields = [];
            if (!username) missingFields.push('username');
            if (!email) missingFields.push('email');
            if (!full_name) missingFields.push('full_name');
            if (!role || (Array.isArray(role) && role.length === 0)) missingFields.push('role');
            if (!status) missingFields.push('status');
            if (!password) missingFields.push('password');

            console.log('Missing required fields:', missingFields);
            return NextResponse.json(
                { success: false, message: `Vui lòng điền đầy đủ thông tin bắt buộc. Thiếu: ${missingFields.join(', ')}` },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: 'Tên đăng nhập hoặc email đã tồn tại' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare user data
        const userData: any = {
            username,
            email,
            full_name,
            role,
            status,
            password_hash: hashedPassword
        };

        // Set unit_id for L2 users
        if (isL2 && rolesToCreate.includes(UserRole.L2)) {
            // L2 creating another L2 in their unit
            userData.unit_id = currentUser.unit_id;
        } else if (unit_id && (canCreateAllRoles || rolesToCreate.includes(UserRole.L2))) {
            // Admin/L1 can specify unit_id for L2 users
            userData.unit_id = unit_id;
        }

        // Create new user
        const user = new User(userData);

        await user.save();

        return NextResponse.json({
            success: true,
            message: 'Tạo người dùng thành công',
            data: {
                user_id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error: any) {
        console.error('Error creating user:', error);

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
