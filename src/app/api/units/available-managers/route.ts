import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import { authUtils, hasAnyRole } from '@/lib/auth';
import { UserRole } from '@/types';

export async function GET(request: NextRequest) {
    try {
        // Verify authentication
        const authHeader = request.headers.get('authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const decoded = authUtils.verifyToken(token);
        if (!decoded) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        await connectToDatabase();

        // Get current user to check permissions
        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Check if user has permission to manage units
        if (!hasAnyRole(currentUser.role, [UserRole.L1, UserRole.ADMIN])) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        // L1 và ADMIN có thể chọn bất cứ ai làm quản lý đơn vị
        // Loại trừ chính user hiện tại để tránh tự assign
        const availableUsers = await User.find({
            _id: { $ne: currentUser._id }
        }).select('_id full_name email username role');

        return NextResponse.json({
            success: true,
            data: availableUsers
        });

    } catch (error) {
        console.error('Error fetching available managers:', error);
        return NextResponse.json(
            { success: false, message: 'Lỗi server' },
            { status: 500 }
        );
    }
}
