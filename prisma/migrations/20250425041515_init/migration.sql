-- CreateTable
CREATE TABLE "component_master" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "original_name" TEXT NOT NULL DEFAULT '',
    "price" DOUBLE PRECISION,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "component_master_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "component_master_code_key" ON "component_master"("code");
