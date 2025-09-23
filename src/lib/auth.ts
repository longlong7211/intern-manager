import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export const authUtils = {
    // Hash password
    hashPassword: async (password: string): Promise<string> => {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    },

    // Compare password
    comparePassword: async (password: string, hashedPassword: string): Promise<boolean> => {
        return await bcrypt.compare(password, hashedPassword);
    },

    // Generate JWT token
    generateToken: (payload: { userId: string; email: string; role: UserRole | UserRole[] }): string => {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
    },

    // Verify JWT token
    verifyToken: (token: string): any => {
        try {
            console.log('JWT_SECRET exists:', !!JWT_SECRET);
            console.log('Token to verify:', token.substring(0, 20) + '...');
            const result = jwt.verify(token, JWT_SECRET);
            console.log('Token verification successful');
            return result;
        } catch (error) {
            console.error('JWT verification error:', error);
            throw new Error('Invalid token');
        }
    },

    // Extract token from request headers
    extractTokenFromHeader: (authHeader: string | undefined): string | null => {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }
};

// Helper function to check if user has specific role
export const hasRole = (userRole: UserRole | UserRole[], targetRole: UserRole): boolean => {
    if (Array.isArray(userRole)) {
        return userRole.includes(targetRole);
    }
    return userRole === targetRole;
};

// Helper function to check if user has any of the roles
export const hasAnyRole = (userRole: UserRole | UserRole[], targetRoles: UserRole[]): boolean => {
    if (Array.isArray(userRole)) {
        return userRole.some(role => targetRoles.includes(role));
    }
    return targetRoles.includes(userRole);
};

// Helper function to get all roles as array
export const getRolesArray = (userRole: UserRole | UserRole[]): UserRole[] => {
    return Array.isArray(userRole) ? userRole : [userRole];
};

export const rolePermissions = {
    // Check if user can review applications at L1 level
    canReviewL1: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.L1, UserRole.ADMIN]);
    },

    // Check if user can review applications at L2 level (accept internship)
    canReviewL2: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.L2, UserRole.ADMIN]);
    },

    // Check if user can adjust hours
    canAdjustHours: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.L1, UserRole.L2, UserRole.ADMIN]);
    },

    // Check if user can only read data
    isReadOnly: (role: UserRole | UserRole[]): boolean => {
        return hasRole(role, UserRole.SUPERVISOR) && !hasAnyRole(role, [UserRole.L1, UserRole.L2, UserRole.ADMIN]);
    },

    // Check if user is admin or has admin privileges
    isAdmin: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.ADMIN, UserRole.L1]);
    },

    // Check if user is student
    isStudent: (role: UserRole | UserRole[]): boolean => {
        return hasRole(role, UserRole.STUDENT);
    },

    // Check if user can access student data
    canAccessStudentData: (userRole: UserRole | UserRole[], targetStudentId: string, userId: string, unitId?: string): boolean => {
        // Admin and L1 can access all
        if (hasAnyRole(userRole, [UserRole.ADMIN, UserRole.L1, UserRole.SUPERVISOR])) {
            return true;
        }

        // Student can only access their own data
        if (hasRole(userRole, UserRole.STUDENT)) {
            return targetStudentId === userId;
        }

        // L2 can access students in their unit (this would need additional logic to check internship unit)
        return false;
    },

    // Check if user can manage users
    canManageUsers: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.ADMIN, UserRole.L1]);
    },

    // Check if user can manage ALL units (add/edit/delete any unit)
    canManageAllUnits: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.ADMIN, UserRole.L1]);
    },

    // Check if user can view their own unit data
    canViewOwnUnit: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.L2, UserRole.ADMIN, UserRole.L1]);
    },

    // Check if user can access system configuration
    canAccessSystemConfig: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.ADMIN, UserRole.L1]);
    },

    // Check if user can view audit logs
    canViewAuditLogs: (role: UserRole | UserRole[]): boolean => {
        return hasAnyRole(role, [UserRole.ADMIN, UserRole.L1, UserRole.SUPERVISOR]);
    }
};

export const businessRules = {
    // Maximum hours per adjustment
    MAX_HOURS_PER_ADJUSTMENT: 8,

    // Maximum hours per day
    MAX_HOURS_PER_DAY: 12,

    // Minimum reason length
    MIN_REASON_LENGTH: 10,

    // Application status transitions
    getValidTransitions: (currentStatus: string) => {
        const transitions: Record<string, string[]> = {
            'DRAFT': ['SUBMITTED'],
            'SUBMITTED': ['APPROVED_L1', 'REJECTED_L1', 'REVISION_REQUESTED_L1'],
            'REVISION_REQUESTED_L1': ['SUBMITTED'],
            'APPROVED_L1': ['APPROVED_L2', 'REJECTED_L2', 'REVISION_REQUESTED_L2'],
            'REVISION_REQUESTED_L2': ['APPROVED_L1'],
            'APPROVED_L2': ['APPROVED_FINAL'],
            'APPROVED_FINAL': [],
            'REJECTED_L1': [],
            'REJECTED_L2': []
        };

        return transitions[currentStatus] || [];
    },

    // Validate hour adjustment
    validateHourAdjustment: (hours: number, reason: string): { valid: boolean; error?: string } => {
        if (Math.abs(hours) > businessRules.MAX_HOURS_PER_ADJUSTMENT) {
            return { valid: false, error: `Hours adjustment cannot exceed ${businessRules.MAX_HOURS_PER_ADJUSTMENT} hours` };
        }

        if (reason.length < businessRules.MIN_REASON_LENGTH) {
            return { valid: false, error: `Reason must be at least ${businessRules.MIN_REASON_LENGTH} characters` };
        }

        return { valid: true };
    }
};
