import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import User from '../../../../models/User';
import StudentProfile from '../../../../models/StudentProfile';
import { authUtils } from '../../../../lib/auth';
import { ApiResponse, validationSchemas } from '../../../../lib/middleware';
import { UserRole } from '../../../../types';

export async function POST(request: NextRequest) {
    try {
        console.log('Starting registration process...');
        await connectToDatabase();
        console.log('Database connected successfully');

        const body = await request.json();
        console.log('Request body received:', { ...body, password: '[HIDDEN]' });
        const { email, password, full_name, role, unit_id, student_code, major, phone } = body;

        // Validation
        if (!email || !password || !full_name || !role) {
            return ApiResponse.badRequest('Email, password, full_name, and role are required');
        }

        if (!validationSchemas.email.test(email)) {
            return ApiResponse.badRequest('Invalid email format');
        }

        if (!validationSchemas.password.test(password)) {
            return ApiResponse.badRequest('Password must be at least 8 characters');
        }

        if (!Object.values(UserRole).includes(role)) {
            return ApiResponse.badRequest('Invalid role');
        }

        // Check if L2 user has unit_id
        if (role === UserRole.L2 && !unit_id) {
            return ApiResponse.badRequest('L2 users must have a unit_id');
        }

        // Check if student has student_code
        if (role === UserRole.STUDENT && !student_code) {
            return ApiResponse.badRequest('Students must have a student_code');
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return ApiResponse.badRequest('Email already exists');
        }

        // Check if student_code already exists (for students)
        if (role === UserRole.STUDENT && student_code) {
            const existingStudent = await StudentProfile.findOne({ student_code });
            if (existingStudent) {
                return ApiResponse.badRequest('Student code already exists');
            }
        }

        // Hash password
        const hashedPassword = await authUtils.hashPassword(password);

        // Create user
        const user = new User({
            email: email.toLowerCase(),
            password_hash: hashedPassword,
            full_name,
            role,
            unit_id: role === UserRole.L2 ? unit_id : undefined,
            status: 'active'
        });

        await user.save();

        // Create student profile if user is a student
        if (role === UserRole.STUDENT) {
            const studentProfile = new StudentProfile({
                user_id: user._id,
                student_code,
                major,
                phone
            });

            await studentProfile.save();
        }

        // Generate token
        const token = authUtils.generateToken({
            userId: (user._id as any).toString(),
            email: user.email,
            role: user.role
        });

        // Return user data (without password)
        const userData = {
            _id: user._id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            unit_id: user.unit_id,
            status: user.status,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        return Response.json(ApiResponse.success({
            user: userData,
            token
        }, 'Registration successful'), { status: 201 });

    } catch (error) {
        console.error('Registration error:', error);
        console.error('Error stack:', (error as Error).stack);

        // More specific error handling
        if ((error as any).code === 11000) {
            return ApiResponse.badRequest('Email or student code already exists');
        }

        if ((error as Error).message.includes('validation')) {
            return ApiResponse.badRequest((error as Error).message);
        }

        return ApiResponse.serverError(`Registration failed: ${(error as Error).message}`);
    }
}
