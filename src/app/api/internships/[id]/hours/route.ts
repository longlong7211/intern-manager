import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import Internship from '../../../../../models/Internship';
import { authenticateUser, ApiResponse } from '../../../../../lib/middleware';
import { UserRole, ApproverRole } from '../../../../../types';
import { HourService } from '../../../../../services/businessService';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        await connectToDatabase();

        const internship = await Internship.findById(params.id);
        if (!internship) {
            return ApiResponse.notFound('Internship not found');
        }

        // Check permissions
        const userRoles = Array.isArray(authRequest.user.role) ? authRequest.user.role : [authRequest.user.role];
        const canAccess =
            userRoles.includes(UserRole.ADMIN) ||
            userRoles.includes(UserRole.SUPERVISOR) ||
            userRoles.includes(UserRole.L1) ||
            ((userRoles.includes(UserRole.L2) || userRoles.includes(UserRole.L1)) && authRequest.user.unitId === internship.unit_id) ||
            (userRoles.includes(UserRole.STUDENT) && authRequest.user.userId === internship.student_id);

        if (!canAccess) {
            return ApiResponse.forbidden('Cannot access this internship hours');
        }

        const hoursData = await HourService.getInternshipHours(params.id);

        return Response.json(ApiResponse.success(hoursData));

    } catch (error) {
        console.error('Get internship hours error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to fetch internship hours');
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only L1 and L2 can adjust hours
        if (authRequest.user.role !== UserRole.L1 &&
            authRequest.user.role !== UserRole.L2 &&
            authRequest.user.role !== UserRole.ADMIN) {
            return ApiResponse.forbidden('Only L1 and L2 managers can adjust hours');
        }

        await connectToDatabase();

        const body = await request.json();
        const { hours, reason, scope_date, tags } = body;

        // Validation
        if (typeof hours !== 'number' || !reason) {
            return ApiResponse.badRequest('Hours (number) and reason are required');
        }

        if (Math.abs(hours) > 8) {
            return ApiResponse.badRequest('Hour adjustment cannot exceed 8 hours per entry');
        }

        if (reason.length < 10) {
            return ApiResponse.badRequest('Reason must be at least 10 characters');
        }

        const internship = await Internship.findById(params.id);
        if (!internship) {
            return ApiResponse.notFound('Internship not found');
        }

        // Check if L2 can access this internship
        if (authRequest.user.role === UserRole.L2 &&
            authRequest.user.unitId !== internship.unit_id) {
            return ApiResponse.forbidden('You can only adjust hours for internships in your unit');
        }

        const approverRole = authRequest.user.role === UserRole.L1 ? ApproverRole.L1 : ApproverRole.L2;

        const hourLedger = await HourService.addHourAdjustment(
            params.id,
            hours,
            reason,
            authRequest.user.userId,
            approverRole,
            scope_date ? new Date(scope_date) : undefined,
            tags
        );

        return Response.json(ApiResponse.success(hourLedger, 'Hours adjusted successfully'), { status: 201 });

    } catch (error) {
        console.error('Adjust hours error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to adjust hours');
    }
}
