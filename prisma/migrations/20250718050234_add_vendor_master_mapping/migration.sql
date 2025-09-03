-- CreateTable
CREATE TABLE "vendor_master_mapping" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "vendor_name" TEXT,
    "component_name_ocr" TEXT,
    "component_name_corrected" TEXT,
    "master_code_expected" TEXT,
    "master_name_expected" TEXT,
    "master_code" TEXT NOT NULL,
    "master_name" TEXT,
    "category" TEXT NOT NULL DEFAULT '部材費',
    "metadata" JSONB,

    CONSTRAINT "vendor_master_mapping_pkey" PRIMARY KEY ("id")
);
