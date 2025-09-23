import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../../lib/database';
import User from '../../../../../models/User';
import { UserRole } from '../../../../../types';
import { hasAnyRole } from '../../../../../lib/auth';

export async function GET(
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

        // Kiểm tra quyền
        if (!hasAnyRole(currentUser.role, [UserRole.ADMIN, UserRole.L1, UserRole.L2])) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';

        // Build query
        let query: any = {
            status: 'active'
        };

        // L2 can only see users in their unit, L1/ADMIN can see all
        if (hasAnyRole(currentUser.role, [UserRole.L2]) &&
            !hasAnyRole(currentUser.role, [UserRole.L1, UserRole.ADMIN])) {
            query.unit_id = params.id;
        }

        if (search) {
            query.$or = [
                { full_name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { username: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('_id full_name email username role unit_id')
            .limit(50)
            .sort({ full_name: 1 });

        return NextResponse.json({
            success: true,
            data: users
        });

    } catch (error: any) {
        console.error('Error fetching users for managers:', error);

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
