import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@'));
    
    await prisma.$connect();
    console.log('✅ Connected to database successfully!');
    
    const result: any = await prisma.$queryRaw`SELECT NOW() as time`;
    console.log('✅ Database time:', result[0].time);
    
    const tables: any = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('✅ Tables found:', tables.map((t: any) => t.table_name).join(', '));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
