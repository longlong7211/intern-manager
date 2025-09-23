import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/database';

export async function GET() {
    try {
        await connectToDatabase();
        return NextResponse.json({
            status: 'success',
            message: 'Database connected successfully',
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Database connection failed:', error);
        return NextResponse.json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message
        }, { status: 500 });
    }
}
