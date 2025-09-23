import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/intern-manager';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

interface GlobalMongoose {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

// Sử dụng global để tránh tạo nhiều connection trong development
declare global {
    var mongooseGlobal: GlobalMongoose | undefined;
}

let cached = globalThis.mongooseGlobal;

if (!cached) {
    cached = globalThis.mongooseGlobal = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<typeof mongoose> {
    if (cached!.conn) {
        console.log('Using existing database connection');
        return cached!.conn;
    }

    if (!cached!.promise) {
        console.log('Creating new database connection to:', MONGODB_URI);

        const opts = {
            bufferCommands: false,
        };

        try {
            cached!.promise = mongoose.connect(MONGODB_URI, opts);
        } catch (error) {
            console.error('Failed to create mongoose connection:', error);
            throw error;
        }
    }

    try {
        cached!.conn = await cached!.promise;
        console.log('Connected to MongoDB successfully');
    } catch (e) {
        cached!.promise = null;
        console.error('Failed to connect to MongoDB:', e);
        throw e;
    }

    return cached!.conn;
}
