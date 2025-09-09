import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { normalizeText } from "@/utils";
import { prisma } from "@/lib/prisma";
import { NextResponseUtf8 } from "@/lib/next-response-utf8";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'ケーブル600VCV14Sq-3C';
  const vendor = searchParams.get('vendor');
  const method = searchParams.get('method') || 'trigram';
  const categories = searchParams.getAll('category[]');
  
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 10; // ensure number early

  // Normalize the query string
  const normalizedQuery = normalizeText(query);
  
  try {
    const results = [];
    
    // Step 1: Search vendor_master_mapping for exact matches
    const mappingWhereClause: Prisma.VendorMasterMappingWhereInput = {
      component_name_ocr: normalizedQuery
    };
    
    if (vendor) {
      mappingWhereClause.vendor_name = vendor;
    }
    
    if (categories.length > 0) {
      mappingWhereClause.category = { in: categories };
    }
    
    const mappingMatches = await prisma.vendorMasterMapping.findMany({
      where: mappingWhereClause,
      orderBy: { updated_at: 'desc' },
    });
    
    // For each mapping match, get the corresponding component from component_master
    for (const mapping of mappingMatches) {
      const component = await prisma.componentMaster.findUnique({
        where: { code: mapping.master_code }
      });
      
      if (component) {
        results.push({
          id: component.id,
          code: component.code,
          name: component.originalName || component.name,
          normalizedName: component.name,
          price: component.price,
          category: component.category,
          score: 1, // Perfect match score
          method: 'exact_match',
          source: 'mapping',
          vendor_name: mapping.vendor_name
        });
        // Break once at least one mapping-based result is found
        break;
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

    // Step 2: Perform fuzzy search
    let fuzzyResults: RawComponentResult[] = [];
    
    if (method === 'trigram') {
      // Enable pg_trgm extension if it's not already enabled
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions`;
      
      // Execute the trigram similarity query
      if (categories.length > 0) {
        fuzzyResults = await prisma.$queryRawUnsafe<RawComponentResult[]>(`
          SELECT id, code, name, original_name, price, category, extensions.similarity(name, $1) AS score
          FROM "component_master"
          WHERE category = ANY($2::text[])
          ORDER BY score DESC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT $3
        `, normalizedQuery, categories, limit);
      } else {
        fuzzyResults = await prisma.$queryRaw<RawComponentResult[]>`
          SELECT id, code, name, original_name, price, category, extensions.similarity(name, ${normalizedQuery}) AS score
          FROM "component_master"
          ORDER BY score DESC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT ${limit}
        `;
      }
    } else {
      if (categories.length > 0) {
        fuzzyResults = await prisma.$queryRawUnsafe<RawComponentResult[]>(`
          SELECT id, code, name, original_name, price, category, extensions.levenshtein(name, $1) AS score
          FROM "component_master"
          WHERE category = ANY($2::text[])
          ORDER BY score ASC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT $3
        `, normalizedQuery, categories, limit);
      } else {
        fuzzyResults = await prisma.$queryRaw<RawComponentResult[]>`
          SELECT id, code, name, original_name, price, category, extensions.levenshtein(name, ${normalizedQuery}) AS score
          FROM "component_master"
          ORDER BY score ASC, updated DESC NULLS LAST, code ASC NULLS LAST, id ASC
          LIMIT ${limit}
        `;
      }
    }
    
    // Process fuzzy search results
    const processedFuzzyResults = fuzzyResults.map((item: RawComponentResult) => {
      // For levenshtein, normalize the score to be between 0 and 1 (lower distance = higher score)
      let normalizedScore = Number(item.score);
      if (method === 'levenshtein') {
        // Assuming max distance of 100 for normalization
        normalizedScore = Math.max(0, 1 - (normalizedScore / 100));
      }
      
      return {
        id: Number(item.id),
        code: item.code,
        name: item.original_name || item.name,
        normalizedName: item.name,
        price: item.price === null ? null : Number(item.price),
        category: item.category,
        score: normalizedScore,
        method: method,
        source: 'component'
      };
    });
    
    // Combine results and remove duplicates based on code
    const seenCodes = new Set(results.map(r => r.code));
    for (const fuzzyResult of processedFuzzyResults) {
      if (!seenCodes.has(fuzzyResult.code)) {
        results.push(fuzzyResult);
      }
    }
    
    // Apply limit to final combined results while preserving order
    const limitedResults = results.slice(0, limit);
    return NextResponseUtf8({ 
      results: limitedResults,
      method: method
    });
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
