import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../../../../lib/database';
import User from '../../../../models/User';
import Unit from '../../../../models/Unit';
import { UserRole } from '../../../../types';
import { hasAnyRole, hasRole } from '../../../../lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const resolvedParams = await params;
        const headersList = await headers();
        const authorization = headersList.get('authorization');

        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Find unit
        const unit = await Unit.findById(resolvedParams.id)
            .populate('managers', 'full_name email username role');

        if (!unit) {
            return NextResponse.json(
                { success: false, message: 'Không tìm thấy đơn vị' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: unit
        });

    } catch (error: any) {
        console.error('Error getting unit:', error);

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Lỗi server', error: error.message },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const resolvedParams = await params;
        const headersList = await headers();
        const authorization = headersList.get('authorization');

        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Kiểm tra quyền cập nhật unit
        const canManageAllUnits = hasAnyRole(currentUser.role, [UserRole.ADMIN, UserRole.L1]);
        const isUnitManager = (hasRole(currentUser.role, UserRole.L2) || hasRole(currentUser.role, UserRole.L1)) &&
            currentUser.unit_id === resolvedParams.id;

        if (!canManageAllUnits && !isUnitManager) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền cập nhật đơn vị' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { name, address, contact_person, contact_email, contact_phone, description, is_active, managers } = body;

        // Tìm unit cần cập nhật
        const unit = await Unit.findById(resolvedParams.id);
        if (!unit) {
            return NextResponse.json(
                { success: false, message: 'Không tìm thấy đơn vị' },
                { status: 404 }
            );
        }

        // Kiểm tra trùng tên (trừ chính nó)
        if (name && name !== unit.name) {
            const existingUnit = await Unit.findOne({ name, _id: { $ne: resolvedParams.id } });
            if (existingUnit) {
                return NextResponse.json(
                    { success: false, message: 'Tên đơn vị đã tồn tại' },
                    { status: 400 }
                );
            }
        }

        // Cập nhật thông tin
        const updateData: any = {
            updated_at: new Date()
        };

        if (name !== undefined) updateData.name = name;
        if (address !== undefined) updateData.address = address;
        if (contact_person !== undefined) updateData.contact_person = contact_person;
        if (contact_email !== undefined) updateData.contact_email = contact_email;
        if (contact_phone !== undefined) updateData.contact_phone = contact_phone;
        if (description !== undefined) updateData.description = description;
        if (is_active !== undefined) updateData.is_active = is_active;

        // Handle managers update
        if (managers !== undefined) {
            // Only L1 and ADMIN can change managers
            if (canManageAllUnits) {
                // Validate new managers
                if (managers.length > 0) {
                    const managerUsers = await User.find({
                        _id: { $in: managers },
                        status: 'active'
                    });

                    if (managerUsers.length !== managers.length) {
                        return NextResponse.json(
                            { success: false, message: 'Một hoặc nhiều người quản lý không tồn tại hoặc không hoạt động' },
                            { status: 400 }
                        );
                    }

                    // L1 và ADMIN có thể chọn bất cứ ai làm manager
                    // Tự động thêm L2 role nếu họ chưa có L1 hoặc L2
                    for (const manager of managerUsers) {
                        const managerRoles = Array.isArray(manager.role) ? manager.role : [manager.role];

                        // Chỉ thêm L2 nếu người đó chưa có L1 hoặc L2
                        if (!managerRoles.includes(UserRole.L1) && !managerRoles.includes(UserRole.L2)) {
                            const updatedRoles = [...managerRoles, UserRole.L2];
                            await User.findByIdAndUpdate(manager._id, {
                                role: updatedRoles,
                                unit_id: resolvedParams.id
                            });
                        } else {
                            // Người đã có L1 hoặc L2 thì chỉ cần cập nhật unit_id
                            await User.findByIdAndUpdate(manager._id, {
                                unit_id: resolvedParams.id
                            });
                        }
                    }
                }

                // Remove old managers who are no longer in the list
                const oldManagers = unit.managers || [];
                const removedManagers: string[] = oldManagers.map((id: any) => id.toString()).filter((oldId: string) => !managers.includes(oldId));

                if (removedManagers.length > 0) {
                    // Remove L2 role and unit_id for removed managers (if they don't have other roles)
                    for (const removedManagerId of removedManagers) {
                        const removedManager = await User.findById(removedManagerId);
                        if (removedManager) {
                            const managerRoles = Array.isArray(removedManager.role) ? removedManager.role : [removedManager.role];
                            const filteredRoles: UserRole[] = managerRoles.filter((role: UserRole) => role !== UserRole.L2);

                            await User.findByIdAndUpdate(removedManagerId, {
                                role: filteredRoles.length > 0 ? filteredRoles : [UserRole.STUDENT],
                                unit_id: null
                            });
                        }
                    }
                }

                updateData.managers = managers;
            } else {
                return NextResponse.json(
                    { success: false, message: 'Không có quyền thay đổi người quản lý' },
                    { status: 403 }
                );
            }
        }

        const updatedUnit = await Unit.findByIdAndUpdate(resolvedParams.id, updateData, { new: true });

        return NextResponse.json({
            success: true,
            message: 'Cập nhật đơn vị thành công',
            data: updatedUnit
        });

    } catch (error: any) {
        console.error('Error updating unit:', error);

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Lỗi server', error: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();

        const resolvedParams = await params;
        const headersList = await headers();
        const authorization = headersList.get('authorization');

        if (!authorization?.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        const token = authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        const currentUser = await User.findById(decoded.userId);
        if (!currentUser) {
            return NextResponse.json(
                { success: false, message: 'Người dùng không tồn tại' },
                { status: 401 }
            );
        }

        // Kiểm tra quyền xóa unit
        if (!hasAnyRole(currentUser.role, [UserRole.ADMIN, UserRole.L1])) {
            return NextResponse.json(
                { success: false, message: 'Không có quyền xóa đơn vị' },
                { status: 403 }
            );
        }

        // Tìm unit cần xóa
        const unit = await Unit.findById(resolvedParams.id);
        if (!unit) {
            return NextResponse.json(
                { success: false, message: 'Không tìm thấy đơn vị' },
                { status: 404 }
            );
        }

        // Kiểm tra xem có thực tập sinh nào đang thực tập tại đơn vị này không
        const InternshipApplication = require('../../../../models/InternshipApplication').default;
        const Internship = require('../../../../models/Internship').default;

        const activeApplications = await InternshipApplication.countDocuments({
            unit_id: resolvedParams.id,
            status: { $in: ['SUBMITTED', 'APPROVED_L1', 'APPROVED_L2', 'APPROVED_FINAL'] }
        });

        const activeInternships = await Internship.countDocuments({
            unit_id: resolvedParams.id,
            status: 'ACTIVE'
        });

        if (activeApplications > 0 || activeInternships > 0) {
            return NextResponse.json(
                { success: false, message: 'Không thể xóa đơn vị đang có sinh viên thực tập hoặc đơn đăng ký đang xử lý' },
                { status: 400 }
            );
        }

        // Xóa unit
        await Unit.findByIdAndDelete(resolvedParams.id);

        return NextResponse.json({
            success: true,
            message: 'Xóa đơn vị thành công'
        });

    } catch (error: any) {
        console.error('Error deleting unit:', error);

        if (error.name === 'JsonWebTokenError') {
            return NextResponse.json(
                { success: false, message: 'Token không hợp lệ' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { success: false, message: 'Lỗi server', error: error.message },
            { status: 500 }
        );
    }
}
