import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../lib/database';
import User from '../../../models/User';
import Unit from '../../../models/Unit';
import { UserRole } from '../../../types';
import { hasAnyRole } from '../../../lib/auth';

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

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const active_only = searchParams.get('active_only') === 'true';

        // Build query
        const query: any = {};

        if (active_only) {
            query.is_active = true;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { contact_person: { $regex: search, $options: 'i' } },
                { contact_email: { $regex: search, $options: 'i' } }
            ];
        }

        // Get units with pagination
        const skip = (page - 1) * limit;
        const units = await Unit.find(query)
            .populate({
                path: 'managers',
                select: 'full_name email username',
                options: { strictPopulate: false }
            })
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        const total = await Unit.countDocuments(query);

        return NextResponse.json({
            success: true,
            data: units,
            pagination: {
                current: page,
                pageSize: limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error: any) {
        console.error('Get units error:', error);

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

        // Kiểm tra quyền tạo unit
        if (!hasAnyRole(currentUser.role, [UserRole.ADMIN, UserRole.L1])) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền tạo đơn vị' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, address, contact_person, contact_email, contact_phone, description, is_active, managers } = body;

        // Validation
        if (!name) {
            return NextResponse.json(
                { success: false, message: 'Tên đơn vị là bắt buộc' },
                { status: 400 }
            );
        }

        // Check if unit name already exists
        const existingUnit = await Unit.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingUnit) {
            return NextResponse.json(
                { success: false, message: 'Tên đơn vị đã tồn tại' },
                { status: 400 }
            );
        }

        // Validate managers if provided
        let validatedManagers: string[] = [];
        if (managers && managers.length > 0) {
            // Check if all managers exist
            const managerUsers = await User.find({
                _id: { $in: managers },
                status: 'active'
            });

            if (managerUsers.length !== managers.length) {
                return NextResponse.json(
                    { success: false, message: 'Một hoặc nhiều người quản lý không tồn tại hoặc không hoạt động' },
                    { status: 400 }
                );
            }

            // L1 có thể chọn bất cứ ai làm manager
            // Tự động thêm L2 role nếu họ chưa có L1 hoặc L2
            for (const manager of managerUsers) {
                const managerRoles = Array.isArray(manager.role) ? manager.role : [manager.role];

                // Chỉ thêm L2 nếu người đó chưa có L1 hoặc L2
                if (!managerRoles.includes(UserRole.L1) && !managerRoles.includes(UserRole.L2)) {
                    const updatedRoles = [...managerRoles, UserRole.L2];
                    await User.findByIdAndUpdate(manager._id, {
                        role: updatedRoles
                    });
                }
            }
            validatedManagers = managers;
        }

        const unit = new Unit({
            name,
            address,
            contact_person,
            contact_email,
            contact_phone,
            description,
            is_active: is_active !== undefined ? is_active : true,
            managers: validatedManagers
        });

        await unit.save();

        // Update managers' unit_id
        if (validatedManagers.length > 0) {
            await User.updateMany(
                { _id: { $in: validatedManagers } },
                { unit_id: (unit._id as any).toString() }
            );
        }

        return NextResponse.json({
            success: true,
            data: unit,
            message: 'Tạo đơn vị thành công'
        }, { status: 201 });

    } catch (error: any) {
        console.error('Create unit error:', error);

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
