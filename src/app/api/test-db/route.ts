import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Create a new PrismaClient instance for this test
const testPrisma = new PrismaClient();

export async function GET() {
  try {
    // Define a type for the raw query result
    interface CountResult {
      count: bigint | number;
    }
    
    // Try to query the database
    const result = await testPrisma.$queryRaw`SELECT COUNT(*) FROM "ComponentMaster"`;
    
    // Convert BigInt to Number for JSON serialization
    const count = Number((result as CountResult[])[0].count);
    
    // Close the connection
    await testPrisma.$disconnect();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection successful',
      count
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    // Try to close the connection
    try {
      await testPrisma.$disconnect();
    } catch (disconnectError) {
      console.error('Error disconnecting from database:', disconnectError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to connect to database',
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
