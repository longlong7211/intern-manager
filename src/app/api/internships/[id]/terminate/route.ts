import { NextRequest } from 'next/server';
import { connectToDatabase } from '../../../../../lib/database';
import TerminationRequest from '../../../../../models/TerminationRequest';
import Internship from '../../../../../models/Internship';
import { authenticateUser, ApiResponse, requireRole, requireNotReadOnly } from '../../../../../lib/middleware';
import { UserRole } from '../../../../../types';
import { TerminationService } from '../../../../../services/businessService';

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authRequest = await authenticateUser(request);

        if (!authRequest.user) {
            return ApiResponse.unauthorized();
        }

        // Only L2 reviewers can process termination
        try {
            requireRole([UserRole.L2, UserRole.ADMIN])(authRequest.user);
            requireNotReadOnly()(authRequest.user);
        } catch (error) {
            return ApiResponse.forbidden((error as Error).message);
        }

        await connectToDatabase();

        const body = await request.json();
        const { approve, comment } = body;

        // Validation
        if (typeof approve !== 'boolean') {
            return ApiResponse.badRequest('approve field is required and must be boolean');
        }

        const internship = await Internship.findById(params.id);
        if (!internship) {
            return ApiResponse.notFound('Internship not found');
        }

        // Check if L2 can access this internship
        if (authRequest.user.role === UserRole.L2 &&
            authRequest.user.unitId !== internship.unit_id) {
            return ApiResponse.forbidden('You can only process terminations for internships in your unit');
        }

        // Find the pending termination request
        const terminationRequest = await TerminationRequest.findOne({
            internship_id: params.id,
            status: 'PENDING'
        });

        if (!terminationRequest) {
            return ApiResponse.notFound('No pending termination request found for this internship');
        }

        const processedRequest = await TerminationService.processTermination(
            terminationRequest._id,
            authRequest.user.userId,
            approve,
            comment
        );

        return Response.json(ApiResponse.success(processedRequest, 'Termination request processed successfully'));

    } catch (error) {
        console.error('Process termination error:', error);
        if ((error as Error).message.includes('Invalid token')) {
            return ApiResponse.unauthorized();
        }
        return ApiResponse.serverError('Failed to process termination request');
    }
}
