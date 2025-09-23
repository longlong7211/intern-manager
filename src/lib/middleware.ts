import { NextRequest } from 'next/server';
import { authUtils, rolePermissions, hasAnyRole } from '../lib/auth';
import { UserRole } from '../types';
import User from '../models/User';
import { connectToDatabase } from '../lib/database';

export interface AuthenticatedRequest extends NextRequest {
    user?: {
        userId: string;
        email: string;
        role: UserRole | UserRole[];
        unitId?: string;
    };
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedRequest> {
    const authHeader = request.headers.get('authorization');
    const token = authUtils.extractTokenFromHeader(authHeader || undefined);

    if (!token) {
        throw new Error('No token provided');
    }

    try {
        const decoded = authUtils.verifyToken(token);
        console.log('Decoded token:', decoded);

        // Verify user still exists and is active
        await connectToDatabase();
        const user = await User.findById(decoded.userId);
        console.log('User found:', user ? 'Yes' : 'No');

        if (!user || user.status !== 'active') {
            throw new Error('User not found or inactive');
        }

        (request as AuthenticatedRequest).user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            unitId: user.unit_id
        };

        return request as AuthenticatedRequest;
    } catch (error) {
        console.error('Authentication error:', error);
        throw new Error('Invalid token');
    }
}

export function requireRole(allowedRoles: UserRole[]) {
    return (user: { role: UserRole | UserRole[] }) => {
        if (!hasAnyRole(user.role, allowedRoles)) {
            throw new Error('Insufficient permissions');
        }
    };
}

export function requireNotReadOnly() {
    return (user: { role: UserRole | UserRole[] }) => {
        if (rolePermissions.isReadOnly(user.role)) {
            throw new Error('Read-only access - modification not allowed');
        }
    };
}

export function requireStudentAccess(targetStudentId: string) {
    return (user: { userId: string; role: UserRole | UserRole[]; unitId?: string }) => {
        if (!rolePermissions.canAccessStudentData(user.role, targetStudentId, user.userId, user.unitId)) {
            throw new Error('Cannot access this student data');
        }
    };
}

export async function requireUnitAccess(unitId: string) {
    return (user: { userId: string; role: UserRole | UserRole[]; unitId?: string }) => {
        // Admin and L1 can access all units
        if (hasAnyRole(user.role, [UserRole.ADMIN, UserRole.L1, UserRole.SUPERVISOR])) {
            return;
        }

        // L2 can only access their own unit
        if (hasAnyRole(user.role, [UserRole.L2]) && user.unitId === unitId) {
            return;
        }

        throw new Error('Cannot access this unit data');
    };
}

// Helper to create standardized API responses
export class ApiResponse {
    static success(data: any, message?: string) {
        return {
            success: true,
            data,
            message
        };
    }

    static error(message: string, code?: string, details?: any) {
        return {
            success: false,
            error: {
                message,
                code,
                details
            }
        };
    }

    static unauthorized(message = 'Unauthorized') {
        return Response.json(this.error(message, 'UNAUTHORIZED'), { status: 401 });
    }

    static forbidden(message = 'Forbidden') {
        return Response.json(this.error(message, 'FORBIDDEN'), { status: 403 });
    }

    static badRequest(message: string, details?: any) {
        return Response.json(this.error(message, 'BAD_REQUEST', details), { status: 400 });
    }

    static notFound(message = 'Not found') {
        return Response.json(this.error(message, 'NOT_FOUND'), { status: 404 });
    }

    static serverError(message = 'Internal server error') {
        return Response.json(this.error(message, 'INTERNAL_ERROR'), { status: 500 });
    }
}

// Validation schemas using Zod (if you want to use it later)
export const validationSchemas = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    password: /^.{8,}$/,  // Chỉ yêu cầu ít nhất 8 ký tự
    studentCode: /^[A-Z0-9]{6,20}$/,
    phone: /^[0-9+\-\s()]{10,15}$/
};
