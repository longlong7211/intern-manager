import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../lib/database';
import Internship from '../../../models/Internship';
import { authenticateUser, ApiResponse } from '../../../lib/middleware';
import { UserRole, InternshipStatus } from '../../../types';

export async function GET(request: NextRequest) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        await connectToDatabase();

        const url = new URL(request.url);
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const status = url.searchParams.get('status');
        const student_id = url.searchParams.get('student_id');
        const unit_id = url.searchParams.get('unit_id');

        // Build query based on user role
        let query: any = {};

        switch (authRequest.user.role) {
            case UserRole.STUDENT:
                // Students can only see their own internships
                query.student_id = authRequest.user.userId;
                break;

            case UserRole.L1:
                // L1 can see all internships
                break;

            case UserRole.L2:
                // L2 can see internships in their unit
                query.unit_id = authRequest.user.unitId;
                break;

            case UserRole.SUPERVISOR:
            case UserRole.ADMIN:
                // Supervisors and admins can see all
                break;

            default:
                return ApiResponse.forbidden('Invalid role');
        }

        // Add filters
        if (status) {
            query.status = status;
        }

        const userRoles = Array.isArray(authRequest.user.role) ? authRequest.user.role : [authRequest.user.role];

        if (student_id && (!userRoles.includes(UserRole.STUDENT) || student_id === authRequest.user.userId)) {
            query.student_id = student_id;
        }

        if (unit_id && (userRoles.includes(UserRole.ADMIN) || userRoles.includes(UserRole.SUPERVISOR) ||
            userRoles.includes(UserRole.L1) ||
            ((userRoles.includes(UserRole.L2) || userRoles.includes(UserRole.L1)) && unit_id === authRequest.user.unitId))) {
            query.unit_id = unit_id;
        }

        // Get internships with pagination
        const skip = (page - 1) * limit;
        const internships = await Internship.find(query)
            .populate('student_id', 'full_name email')
            .populate('unit_id', 'name')
            .populate('application_id', 'position_title')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Internship.countDocuments(query);

        return Response.json(ApiResponse.success({
            internships,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        }));

    } catch (error) {
        console.error('Get internships error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to fetch internships');
    }
}
