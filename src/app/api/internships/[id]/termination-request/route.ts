import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import Internship from '../../../../../models/Internship';
import { authenticateUser, ApiResponse, requireRole, requireNotReadOnly } from '../../../../../lib/middleware';
import { UserRole, InternshipStatus } from '../../../../../types';
import { TerminationService } from '../../../../../services/businessService';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only students can request termination of their own internships
        try {
            requireRole([UserRole.STUDENT])(authRequest.user);
            requireNotReadOnly()(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        const body = await request.json();
        const { reason } = body;

        const internship = await Internship.findById(params.id);
        if (!internship) {
            return ApiResponse.notFound('Internship not found');
        }

        // Check if user owns this internship
        if (internship.student_id !== authRequest.user.userId) {
            return ApiResponse.forbidden('You can only request termination for your own internship');
        }

        // Check if internship is active
        if (internship.status !== InternshipStatus.ACTIVE) {
            return ApiResponse.badRequest('Can only request termination for active internships');
        }

        const terminationRequest = await TerminationService.requestTermination(
            params.id,
            authRequest.user.userId,
            reason
        );

        return Response.json(ApiResponse.success(terminationRequest, 'Termination request submitted successfully'), { status: 201 });

    } catch (error) {
        console.error('Request termination error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        if ((error as Error).message.includes('already a pending')) {
            return ApiResponse.badRequest((error as Error).message);
        }
        return ApiResponse.serverError('Failed to request termination');
    }
}
