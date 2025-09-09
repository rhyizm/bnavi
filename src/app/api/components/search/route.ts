import { NextRequest, NextResponse } from 'next/server';
import { normalizeText } from "@/utils";
import { prisma } from "@/lib/prisma";
import { NextResponseUtf8 } from "@/lib/next-response-utf8";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'ケーブル600VCV14Sq-3C';
  const method = searchParams.get('method') || 'trigram';
  
  // Get category filters
  const categories = searchParams.getAll('category[]');

  let limit = searchParams.get('limit') || 10;
  if (typeof limit === 'string') {
    limit = parseInt(limit, 10);
  }

  // Normalize the query string
  const normalizedQuery = normalizeText(query);
  
  try {
    let rawResults;
    
    // Build WHERE clause for category filtering
    const categoryFilter = categories.length > 0 
      ? `WHERE category IN (${categories.map(() => '?').join(', ')})`
      : '';
    
    // Check if we need to enable the pg_trgm extension for trigram search
    if (method === 'trigram') {
      // Enable pg_trgm extension if it's not already enabled
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions`;
      
      // Execute the trigram similarity query
      if (categories.length > 0) {
        rawResults = await prisma.$queryRawUnsafe(`
          SELECT id, code, name, original_name, price, category, extensions.similarity(name, $1) AS score
          FROM "component_master"
          WHERE category = ANY($2::text[])
          ORDER BY score DESC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT $3
        `, normalizedQuery, categories, limit);
      } else {
        rawResults = await prisma.$queryRaw`
          SELECT id, code, name, original_name, price, category, extensions.similarity(name, ${normalizedQuery}) AS score
          FROM "component_master"
          ORDER BY score DESC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT ${limit}
        `;
      }
    } else {
      // Execute the Levenshtein distance query (default)
      if (categories.length > 0) {
        rawResults = await prisma.$queryRawUnsafe(`
          SELECT id, code, name, original_name, price, category, extensions.levenshtein(name, $1) AS score
          FROM "component_master"
          WHERE category = ANY($2::text[])
          ORDER BY score ASC
          LIMIT $3
        `, normalizedQuery, categories, limit);
      } else {
        rawResults = await prisma.$queryRaw`
          SELECT id, code, name, original_name, price, category, extensions.levenshtein(name, ${normalizedQuery}) AS score
          FROM "component_master"
          ORDER BY score ASC
          LIMIT ${limit}
        `;
      }
    }
    
    // Define a type for the raw database result
    interface RawComponentResult {
      id: bigint;
      code: string;
      name: string;
      original_name: string;
      price: number | bigint | null;
      category: string;
      score: number | bigint;
    }
    
    // Process the results to handle BigInt serialization
    const results = (rawResults as RawComponentResult[]).map((item: RawComponentResult) => ({
      id: Number(item.id),
      code: item.code,
      name: item.original_name || item.name, // Use original_name if available, otherwise fallback to normalized name
      normalizedName: item.name, // Keep the normalized name for reference
      price: item.price === null ? null : Number(item.price),
      category: item.category,
      score: Number(item.score),
      method: method, // Include the search method in the response
      source: 'component' // Adding source for compatibility
    }));
    
    return NextResponseUtf8({ results, method });
  } catch (error) {
    console.error('Error searching components:', error);
    return NextResponseUtf8(
      { error: error instanceof Error ? error.message : 'Failed to search components' },
      { status: 500 }
    );
  } finally {
    // Always disconnect the Prisma client
    await prisma.$disconnect();
  }
}
