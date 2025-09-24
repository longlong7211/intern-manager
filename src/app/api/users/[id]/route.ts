import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '../../../../lib/database';
import User from '../../../../models/User';
import { UserRole } from '../../../../types';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

        // Check if user has admin permissions
        const hasAdminRole = Array.isArray(currentUser.role)
            ? currentUser.role.includes(UserRole.ADMIN)
            : currentUser.role === UserRole.ADMIN;

        if (!hasAdminRole) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        const { id } = params;
        const body = await request.json();
        const { username, email, full_name, role, status, password } = body;

        // Find user to update
        const userToUpdate = await User.findById(id);
        if (!userToUpdate) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 404 }
            );
        }

        // Check if username or email already exists (excluding current user)
        const existingUser = await User.findOne({
            _id: { $ne: id },
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

        // Prepare update data
        const updateData: any = {
            username,
            email,
            full_name,
            role,
            status,
            updated_at: new Date()
        };

        // Update password if provided
        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        // Update user
        await User.findByIdAndUpdate(id, updateData);

        return NextResponse.json({
            success: true,
            message: 'Cập nhật người dùng thành công'
        });

    } catch (error: any) {
        console.error('Error updating user:', error);

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

        // Check if user has admin permissions
        const hasAdminRole = Array.isArray(currentUser.role)
            ? currentUser.role.includes(UserRole.ADMIN)
            : currentUser.role === UserRole.ADMIN;

        if (!hasAdminRole) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền truy cập' },
                { status: 403 }
            );
        }

        const { id } = params;

        // Prevent self-deletion
        if (id === (currentUser._id as any).toString()) {
            return NextResponse.json(
                { success: false, message: 'Không thể xóa chính mình' },
                { status: 400 }
            );
        }

        // Find user to delete
        const userToDelete = await User.findById(id);
        if (!userToDelete) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 404 }
            );
        }

        // Delete user
        await User.findByIdAndDelete(id);

        return NextResponse.json({
            success: true,
            message: 'Xóa người dùng thành công'
        });

    } catch (error: any) {
        console.error('Error deleting user:', error);

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
