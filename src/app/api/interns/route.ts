import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';
import Intern from '@/models/Intern';

export async function GET() {
    try {
        await connectToDatabase();
        const interns = await Intern.find({}).sort({ created_at: -1 });
        return NextResponse.json(interns);
    } catch (error) {
        console.error('Error fetching interns:', error);
        return NextResponse.json({ error: 'Failed to fetch interns' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();
        const body = await request.json();

        const { internship_period, full_name, student_id, email } = body;

        if (!internship_period || !full_name || !student_id || !email) {
            return NextResponse.json({
                error: 'Đợt thực tập, họ tên, MSSV và email là bắt buộc'
            }, { status: 400 });
        }

        const newIntern = new Intern(body);
        await newIntern.save();

        return NextResponse.json(newIntern, { status: 201 });
    } catch (error: any) {
        console.error('Error creating intern:', error);

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return NextResponse.json({
                error: field === 'email' ? 'Email đã tồn tại' : 'MSSV đã tồn tại'
            }, { status: 400 });
        }

        return NextResponse.json({ error: 'Failed to create intern' }, { status: 500 });
    }
}
