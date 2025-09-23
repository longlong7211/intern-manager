import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import Unit from '../models/Unit';
import InternshipApplication from '../models/InternshipApplication';
import Internship from '../models/Internship';
import HourLedger from '../models/HourLedger';
import TerminationRequest from '../models/TerminationRequest';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import { connectToDatabase } from '../lib/database';
import { ApplicationStatus, InternshipStatus, UserRole, ApproverRole } from '../types';

export class AuditService {
    static async logAction(
        actorId: string,
        action: string,
        entityType: string,
        entityId: string,
        before?: any,
        after?: any
    ) {
        try {
            await connectToDatabase();

            const auditLog = new AuditLog({
                actor_id: actorId,
                action,
                entity_type: entityType,
                entity_id: entityId,
                before,
                after
            });

            await auditLog.save();
        } catch (error) {
            console.error('Failed to log audit action:', error);
        }
    }
}

export class NotificationService {
    static async createNotification(
        userId: string,
        type: string,
        title: string,
        body: string
    ) {
        try {
            await connectToDatabase();

            const notification = new Notification({
                user_id: userId,
                type,
                title,
                body
            });

            await notification.save();
            return notification;
        } catch (error) {
            console.error('Failed to create notification:', error);
            throw error;
        }
    }

    static async markAsRead(notificationId: string) {
        try {
            await connectToDatabase();

            const notification = await Notification.findByIdAndUpdate(
                notificationId,
                { is_read: true },
                { new: true }
            );

            return notification;
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
            throw error;
        }
    }

    static async getUserNotifications(userId: string, limit = 50) {
        try {
            await connectToDatabase();

            const notifications = await Notification.find({ user_id: userId })
                .sort({ created_at: -1 })
                .limit(limit);

            return notifications;
        } catch (error) {
            console.error('Failed to get user notifications:', error);
            throw error;
        }
    }
}

export class ApplicationService {
    static async submitApplication(applicationId: string, actorId: string) {
        try {
            await connectToDatabase();

            const application = await InternshipApplication.findById(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            const before = { ...application.toObject() };

            application.status = ApplicationStatus.SUBMITTED;
            application.submitted_at = new Date();
            await application.save();

            // Log audit
            await AuditService.logAction(
                actorId,
                'APPLICATION_SUBMITTED',
                'InternshipApplication',
                applicationId,
                before,
                application.toObject()
            );

            // Create notification for L1 reviewers
            const l1Users = await User.find({ role: UserRole.L1, status: 'active' });
            for (const l1User of l1Users) {
                await NotificationService.createNotification(
                    l1User._id,
                    'APPLICATION_SUBMITTED',
                    'Đơn đăng ký thực tập mới',
                    `Có đơn đăng ký thực tập mới cần được duyệt sơ bộ từ ${application.student_snapshot?.full_name}`
                );
            }

            return application;
        } catch (error) {
            console.error('Failed to submit application:', error);
            throw error;
        }
    }

    static async reviewApplicationL1(
        applicationId: string,
        reviewerId: string,
        decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
        comment?: string
    ) {
        try {
            await connectToDatabase();

            const application = await InternshipApplication.findById(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            const before = { ...application.toObject() };

            application.l1_reviewer_id = reviewerId;
            application.comment_l1 = comment;

            switch (decision) {
                case 'APPROVED':
                    application.status = ApplicationStatus.APPROVED_L1;
                    break;
                case 'REJECTED':
                    application.status = ApplicationStatus.REJECTED_L1;
                    break;
                case 'REVISION_REQUESTED':
                    application.status = ApplicationStatus.REVISION_REQUESTED_L1;
                    break;
            }

            await application.save();

            // Log audit
            await AuditService.logAction(
                reviewerId,
                'APPLICATION_L1_REVIEW',
                'InternshipApplication',
                applicationId,
                before,
                application.toObject()
            );

            // Create notification for student
            await NotificationService.createNotification(
                application.student_id,
                'APPLICATION_L1_REVIEWED',
                'Kết quả duyệt sơ bộ',
                `Đơn đăng ký thực tập của bạn đã được ${decision === 'APPROVED' ? 'duyệt' : decision === 'REJECTED' ? 'từ chối' : 'yêu cầu bổ sung'} ở bậc 1`
            );

            // If approved, notify L2 reviewers
            if (decision === 'APPROVED') {
                const l2Users = await User.find({
                    role: UserRole.L2,
                    unit_id: application.target_unit_id,
                    status: 'active'
                });

                for (const l2User of l2Users) {
                    await NotificationService.createNotification(
                        l2User._id,
                        'APPLICATION_L2_PENDING',
                        'Đơn đăng ký cần duyệt chính thức',
                        `Có đơn đăng ký thực tập cần được duyệt chính thức từ ${application.student_snapshot?.full_name}`
                    );
                }
            }

            return application;
        } catch (error) {
            console.error('Failed to review application L1:', error);
            throw error;
        }
    }

    static async reviewApplicationL2(
        applicationId: string,
        reviewerId: string,
        decision: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED',
        comment?: string
    ) {
        try {
            await connectToDatabase();

            const application = await InternshipApplication.findById(applicationId);
            if (!application) {
                throw new Error('Application not found');
            }

            const before = { ...application.toObject() };

            application.l2_reviewer_id = reviewerId;
            application.comment_l2 = comment;

            switch (decision) {
                case 'APPROVED':
                    application.status = ApplicationStatus.APPROVED_L2;

                    // Create internship record
                    const internship = new Internship({
                        student_id: application.student_id,
                        unit_id: application.target_unit_id,
                        application_id: applicationId,
                        status: InternshipStatus.ACTIVE,
                        start_date: application.start_date_expected || new Date(),
                        student_snapshot: application.student_snapshot,
                        unit_snapshot: application.unit_snapshot,
                        total_hours_cached: 0
                    });

                    await internship.save();
                    break;

                case 'REJECTED':
                    application.status = ApplicationStatus.REJECTED_L2;
                    break;

                case 'REVISION_REQUESTED':
                    application.status = ApplicationStatus.REVISION_REQUESTED_L2;
                    break;
            }

            await application.save();

            // Log audit
            await AuditService.logAction(
                reviewerId,
                'APPLICATION_L2_REVIEW',
                'InternshipApplication',
                applicationId,
                before,
                application.toObject()
            );

            // Create notification for student
            await NotificationService.createNotification(
                application.student_id,
                'APPLICATION_L2_REVIEWED',
                'Kết quả duyệt chính thức',
                `Đơn đăng ký thực tập của bạn đã được ${decision === 'APPROVED' ? 'duyệt và bắt đầu thực tập' : decision === 'REJECTED' ? 'từ chối' : 'yêu cầu bổ sung'} ở bậc 2`
            );

            return application;
        } catch (error) {
            console.error('Failed to review application L2:', error);
            throw error;
        }
    }
}

export class HourService {
    static async addHourAdjustment(
        internshipId: string,
        hours: number,
        reason: string,
        approvedBy: string,
        approverRole: ApproverRole,
        scopeDate?: Date,
        tags?: string[]
    ) {
        try {
            await connectToDatabase();

            const internship = await Internship.findById(internshipId);
            if (!internship) {
                throw new Error('Internship not found');
            }

            if (internship.status !== InternshipStatus.ACTIVE) {
                throw new Error('Cannot adjust hours for inactive internship');
            }

            // Create hour ledger entry
            const hourLedger = new HourLedger({
                internship_id: internshipId,
                hours,
                reason,
                approved_by: approvedBy,
                approver_role: approverRole,
                scope_date: scopeDate,
                tags
            });

            await hourLedger.save();

            // Update cached total hours
            await this.updateCachedHours(internshipId);

            // Log audit
            await AuditService.logAction(
                approvedBy,
                'HOUR_ADJUSTMENT',
                'HourLedger',
                hourLedger._id,
                null,
                hourLedger.toObject()
            );

            // Create notification for student
            await NotificationService.createNotification(
                internship.student_id,
                'HOUR_ADJUSTED',
                'Điều chỉnh giờ thực tập',
                `Giờ thực tập của bạn đã được điều chỉnh ${hours > 0 ? '+' : ''}${hours} giờ. Lý do: ${reason}`
            );

            return hourLedger;
        } catch (error) {
            console.error('Failed to add hour adjustment:', error);
            throw error;
        }
    }

    static async updateCachedHours(internshipId: string) {
        try {
            await connectToDatabase();

            const result = await HourLedger.aggregate([
                { $match: { internship_id: internshipId } },
                { $group: { _id: null, total: { $sum: '$hours' } } }
            ]);

            const totalHours = result.length > 0 ? result[0].total : 0;

            await Internship.findByIdAndUpdate(
                internshipId,
                { total_hours_cached: totalHours }
            );

            return totalHours;
        } catch (error) {
            console.error('Failed to update cached hours:', error);
            throw error;
        }
    }

    static async getInternshipHours(internshipId: string) {
        try {
            await connectToDatabase();

            const hourEntries = await HourLedger.find({ internship_id: internshipId })
                .populate('approved_by', 'full_name role')
                .sort({ created_at: -1 });

            const totalHours = hourEntries.reduce((sum, entry) => sum + entry.hours, 0);

            return {
                totalHours,
                entries: hourEntries
            };
        } catch (error) {
            console.error('Failed to get internship hours:', error);
            throw error;
        }
    }
}

export class TerminationService {
    static async requestTermination(
        internshipId: string,
        requestedBy: string,
        reason?: string
    ) {
        try {
            await connectToDatabase();

            const internship = await Internship.findById(internshipId);
            if (!internship) {
                throw new Error('Internship not found');
            }

            if (internship.status !== InternshipStatus.ACTIVE) {
                throw new Error('Can only request termination for active internships');
            }

            // Check if there's already a pending request
            const existingRequest = await TerminationRequest.findOne({
                internship_id: internshipId,
                status: 'PENDING'
            });

            if (existingRequest) {
                throw new Error('There is already a pending termination request');
            }

            const terminationRequest = new TerminationRequest({
                internship_id: internshipId,
                requested_by: requestedBy,
                reason
            });

            await terminationRequest.save();

            // Update internship status
            internship.status = InternshipStatus.TERMINATION_REQUESTED;
            await internship.save();

            // Log audit
            await AuditService.logAction(
                requestedBy,
                'TERMINATION_REQUESTED',
                'TerminationRequest',
                terminationRequest._id,
                null,
                terminationRequest.toObject()
            );

            // Notify L2 users of the unit
            const l2Users = await User.find({
                role: UserRole.L2,
                unit_id: internship.unit_id,
                status: 'active'
            });

            for (const l2User of l2Users) {
                await NotificationService.createNotification(
                    l2User._id,
                    'TERMINATION_REQUESTED',
                    'Yêu cầu chấm dứt thực tập',
                    `${internship.student_snapshot?.full_name} đã yêu cầu chấm dứt thực tập`
                );
            }

            return terminationRequest;
        } catch (error) {
            console.error('Failed to request termination:', error);
            throw error;
        }
    }

    static async processTermination(
        terminationRequestId: string,
        processedBy: string,
        approve: boolean,
        comment?: string
    ) {
        try {
            await connectToDatabase();

            const terminationRequest = await TerminationRequest.findById(terminationRequestId);
            if (!terminationRequest) {
                throw new Error('Termination request not found');
            }

            const internship = await Internship.findById(terminationRequest.internship_id);
            if (!internship) {
                throw new Error('Internship not found');
            }

            const before = { ...terminationRequest.toObject() };

            terminationRequest.processed_by = processedBy;
            terminationRequest.processed_at = new Date();
            terminationRequest.comment = comment;
            terminationRequest.status = approve ? 'APPROVED' : 'REJECTED';

            await terminationRequest.save();

            if (approve) {
                internship.status = InternshipStatus.COMPLETED;
                internship.end_date = new Date();
            } else {
                internship.status = InternshipStatus.ACTIVE;
            }

            await internship.save();

            // Log audit
            await AuditService.logAction(
                processedBy,
                approve ? 'TERMINATION_APPROVED' : 'TERMINATION_REJECTED',
                'TerminationRequest',
                terminationRequestId,
                before,
                terminationRequest.toObject()
            );

            // Notify student
            await NotificationService.createNotification(
                internship.student_id,
                approve ? 'TERMINATION_APPROVED' : 'TERMINATION_REJECTED',
                approve ? 'Yêu cầu chấm dứt được chấp nhận' : 'Yêu cầu chấm dứt bị từ chối',
                approve
                    ? 'Quá trình thực tập của bạn đã chính thức kết thúc'
                    : `Yêu cầu chấm dứt thực tập của bạn đã bị từ chối. ${comment || ''}`
            );

            return terminationRequest;
        } catch (error) {
            console.error('Failed to process termination:', error);
            throw error;
        }
    }
}
