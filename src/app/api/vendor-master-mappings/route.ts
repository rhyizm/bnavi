import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { normalizeText } from "@/utils";
import { NextResponseUtf8 } from "@/lib/next-response-utf8";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [mappings, total] = await Promise.all([
      prisma.vendorMasterMapping.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.vendorMasterMapping.count(),
    ]);

    return NextResponseUtf8({
      data: mappings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error fetching vendor master mappings:', error);
    return NextResponseUtf8(
      { error: 'Failed to fetch vendor master mappings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Clean all string fields
    const cleanedData = {
      vendor_name: normalizeText(body.vendor_name),
      component_name_ocr: normalizeText(body.component_name_ocr),
      component_name_corrected: body.component_name_corrected,
      master_code_expected: body.master_code_expected,
      master_name_expected: body.master_name_expected,
      master_code: normalizeText(body.master_code) || '', // master_code is required
      master_name: body.master_name,
      category: body.category || '部材費',
      metadata: body.metadata,
    };
    
    // Validate required field
    if (!cleanedData.master_code) {
      return NextResponseUtf8(
        { error: 'master_code is required' },
        { status: 400 }
      );
    }
    
    // Check if master_code exists in component_master
    const componentMaster = await prisma.componentMaster.findUnique({
      where: { code: cleanedData.master_code },
    });
    
    const mapping = await prisma.vendorMasterMapping.create({
      data: cleanedData,
    });

    const response: any = { ...mapping };
    
    if (!componentMaster) {
      response.warning = `Master code '${cleanedData.master_code}' does not exist in component_master table`;
    }

    return NextResponseUtf8(response, { status: 201 });
  } catch (error) {
    console.error('Error creating vendor master mapping:', error);
    return NextResponseUtf8(
      { error: 'Failed to create vendor master mapping' },
      { status: 500 }
    );
  }
}