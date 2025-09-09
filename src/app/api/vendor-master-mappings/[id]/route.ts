import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { NextResponseUtf8 } from "@/lib/next-response-utf8";

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }:  { params:  Promise<{ id: string }> }
) {
  try {
    const id = Number((await params).id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const mapping = await prisma.vendorMasterMapping.findUnique({
      where: { id },
    });

    if (!mapping) {
      return NextResponse.json(
        { error: 'Vendor master mapping not found' },
        { status: 404 }
      );
    }

    return NextResponseUtf8(mapping);
  } catch (error) {
    console.error('Error fetching vendor master mapping:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vendor master mapping' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const mapping = await prisma.vendorMasterMapping.update({
      where: { id },
      data: {
        vendor_name: body.vendor_name,
        component_name_ocr: body.component_name_ocr,
        component_name_corrected: body.component_name_corrected,
        master_code_expected: body.master_code_expected,
        master_name_expected: body.master_name_expected,
        master_code: body.master_code,
        master_name: body.master_name,
        category: body.category,
        metadata: body.metadata,
      },
    });

    return NextResponseUtf8(mapping);
  } catch (error: any) {
    console.error('Error updating vendor master mapping:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Vendor master mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update vendor master mapping' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    await prisma.vendorMasterMapping.delete({
      where: { id },
    });

    return NextResponseUtf8(
      { message: 'Vendor master mapping deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting vendor master mapping:', error);
    
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Vendor master mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete vendor master mapping' },
      { status: 500 }
    );
  }
}