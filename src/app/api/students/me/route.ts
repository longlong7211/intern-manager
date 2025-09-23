import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import StudentProfile from '../../../../models/StudentProfile';
import User from '../../../../models/User';
import { authenticateUser, ApiResponse, requireRole } from '../../../../lib/middleware';
import { UserRole } from '../../../../types';

export async function GET(request: NextRequest) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only students can access this endpoint
        try {
            requireRole([UserRole.STUDENT])(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        // Get user and student profile
        const user = await User.findById(authRequest.user.userId).select('-password_hash');
        const studentProfile = await StudentProfile.findOne({ user_id: authRequest.user.userId });

        if (!user) {
            return ApiResponse.notFound('User not found');
        }

        const data = {
            user,
            profile: studentProfile
        };

        return Response.json(ApiResponse.success(data));

    } catch (error) {
        console.error('Get student profile error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to fetch student profile');
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only students can update their own profile
        try {
            requireRole([UserRole.STUDENT])(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        const body = await request.json();
        const { full_name, major, phone, cv_url, note } = body;

        // Update user info
        const user = await User.findById(authRequest.user.userId);
        if (!user) {
            return ApiResponse.notFound('User not found');
        }

        if (full_name) {
            user.full_name = full_name;
            await user.save();
        }

        // Update or create student profile
        let studentProfile = await StudentProfile.findOne({ user_id: authRequest.user.userId });

        if (studentProfile) {
            if (major !== undefined) studentProfile.major = major;
            if (phone !== undefined) studentProfile.phone = phone;
            if (cv_url !== undefined) studentProfile.cv_url = cv_url;
            if (note !== undefined) studentProfile.note = note;

            await studentProfile.save();
        }

        const data = {
            user: await User.findById(authRequest.user.userId).select('-password_hash'),
            profile: studentProfile
        };

        return Response.json(ApiResponse.success(data, 'Profile updated successfully'));

    } catch (error) {
        console.error('Update student profile error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to update student profile');
    }
}
