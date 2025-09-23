import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import Intern from '@/models/Intern';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectToDatabase();
        const intern = await Intern.findById(params.id);

        if (!intern) {
            return NextResponse.json({ error: 'Không tìm thấy sinh viên thực tập' }, { status: 404 });
        }

        return NextResponse.json(intern);
    } catch (error) {
        console.error('Error fetching intern:', error);
        return NextResponse.json({ error: 'Failed to fetch intern' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectToDatabase();
        const body = await request.json();

        const updatedIntern = await Intern.findByIdAndUpdate(
            params.id,
            body,
            { new: true, runValidators: true }
        );

        if (!updatedIntern) {
            return NextResponse.json({ error: 'Không tìm thấy sinh viên thực tập' }, { status: 404 });
        }

        return NextResponse.json(updatedIntern);
    } catch (error: any) {
        console.error('Error updating intern:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({
                error: field === 'email' ? 'Email đã tồn tại' : 'MSSV đã tồn tại'
            }, { status: 400 });
        }

        return NextResponse.json({ error: 'Không thể cập nhật sinh viên thực tập' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await connectToDatabase();
        const deletedIntern = await Intern.findByIdAndDelete(params.id);

        if (!deletedIntern) {
            return NextResponse.json({ error: 'Không tìm thấy sinh viên thực tập' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Xóa sinh viên thực tập thành công' });
    } catch (error) {
        console.error('Error deleting intern:', error);
        return NextResponse.json({ error: 'Failed to delete intern' }, { status: 500 });
    }
}
