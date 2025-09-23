import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../lib/database';
import User from '../../../../models/User';
import { authUtils } from '../../../../lib/auth';
import { ApiResponse, validationSchemas } from '../../../../lib/middleware';
import { UserRole } from '../../../../types';

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();

        const body = await request.json();
        const { email, password } = body;

        // Validation
        if (!email || !password) {
            return ApiResponse.badRequest('Email and password are required');
        }

        if (!validationSchemas.email.test(email)) {
            return ApiResponse.badRequest('Invalid email format');
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return ApiResponse.unauthorized('Invalid email or password');
        }

        // Check if user is active
        if (user.status !== 'active') {
            return ApiResponse.unauthorized('Account is inactive');
        }

        // Verify password
        const isValidPassword = await authUtils.comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return ApiResponse.unauthorized('Invalid email or password');
        }

        // Generate token
        const token = authUtils.generateToken({
            userId: user._id,
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
        }, 'Login successful'));

    } catch (error) {
        console.error('Login error:', error);
        return ApiResponse.serverError('Login failed');
    }
}
