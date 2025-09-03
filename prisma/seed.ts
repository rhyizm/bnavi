import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import csvParser from "csv-parser";

// ESM 形式で __dirname を取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// **ヘッダーマッピング設定**
const headerMappings: Record<string, string> = {
    "品番コード": "code",
    "製品名": "name",
    "機器単価": "price",
    // 将来的に追加のマッピングをここに定義
};

// **ヘッダー名を変換する関数**
const mapHeader = (header: string): string => {
    const trimmedHeader = header.trim();
    return headerMappings[trimmedHeader] || trimmedHeader;
};

// **テキスト標準化関数**
const normalizeText = (str: string): string => {
    return str
        .normalize("NFKC")  // **全角 → 半角変換 & 正規化**
        .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))  // 記号 & 英数字を半角化
        .replace(/　/g, " ")  // **全角スペース → 半角スペース**
        .replace(/[‐−‒–—―]/g, "-")  // **ハイフンの統一**
        .replace(/\s+/g, " ")  // **連続スペースを1つに統一**
        .trim();  // **前後のスペースを削除**
};

// **日付を変換する関数（undefined を考慮）**
const parseDate = (dateString: string | undefined): Date | null => {
    if (!dateString) {
        console.error("❌ Warning: Missing date field");
        return null;
    }

    const raw = dateString.trim();
    let normalized = raw;

    // Support YYYYMMDD (e.g., 20250901) by converting to YYYY-MM-DD
    const yyyymmdd = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
    if (yyyymmdd) {
        const [, y, m, d] = yyyymmdd;
        normalized = `${y}-${m}-${d}`;
    } else {
        // Normalize slashes to dashes for YYYY/MM/DD
        normalized = raw.replace(/\//g, "-");
    }

    const date = new Date(normalized);

    if (isNaN(date.getTime())) {
        console.error(`❌ Invalid date format: ${dateString}`);
        return null;
    }

    return date;
};

const processCSVFile = async (filePath: string, category: string): Promise<any[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const components: any[] = [];

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csvParser({ mapHeaders: ({ header }) => mapHeader(header) })) // ヘッダーマッピングを適用
            .on("data", (row) => {
                console.log("🔍 Debug Row:", row);

                const updatedDate = row.updated ? parseDate(row.updated) : new Date();
                if (row.updated && !updatedDate) {
                    console.warn(`⚠️ Skipping row due to invalid date: ${JSON.stringify(row)}`);
                    return;
                }

                // Prefer original_name as the source of truth; fall back to name if present
                const original = (row.original_name ?? row.name) as string | undefined;
                if (!original) {
                    console.warn(`⚠️ Skipping row due to missing original_name/name: ${JSON.stringify(row)}`);
                    return;
                }

                const normalizedName = normalizeText(original);
                if (!normalizedName) {
                    console.warn(`⚠️ Skipping row due to blank name: ${JSON.stringify(row)}`);
                    return;
                }

                components.push({
                    updated: updatedDate,
                    name: normalizedName, // **original_name を正規化**
                    originalName: original, // **元の名前をそのまま保存**
                    code: row.code.trim(),
                    category: category,
                    price: (() => {
                        const val = parseFloat(row.price.trim());
                        return isNaN(val) ? null : val;
                    })(),
                });
            })
            .on("end", () => {
                resolve(components);
            })
            .on("error", (error) => {
                reject(error);
            });
    });
};

const seedData = async () => {
    const dataDir = path.join(__dirname, "./data");
    
    try {
        // Get all CSV files in the data directory
        const files = fs.readdirSync(dataDir).filter(file => file.endsWith(".csv"));
        
        for (const file of files) {
            let category: string | null = null;
            
            // Determine category based on filename
            if (file === "部材費.csv" || file === "部材費マスタ.csv") {
                category = "部材費";
            } else if (file === "機器費.csv" || file === "機器費マスタ.csv") {
                category = "機器費";
            }
            
            // Skip files that don't match our criteria
            if (!category) {
                console.log(`⏭️ Skipping file: ${file}`);
                continue;
            }
            
            console.log(`\n📁 Processing file: ${file} with category: ${category}`);
            
            // Delete existing data for this category
            const deleteResult = await prisma.componentMaster.deleteMany({
                where: { category: category }
            });
            console.log(`🗑️ Deleted ${deleteResult.count} existing records for category: ${category}`);
            
            // Process the CSV file
            const filePath = path.join(dataDir, file);
            const components = await processCSVFile(filePath, category);
            
            if (components.length > 0) {
                // Insert new data
                const insertResult = await prisma.componentMaster.createMany({
                    data: components,
                    skipDuplicates: true,
                });
                console.log(`✅ Inserted ${components.length} records for category: ${category}`);
            } else {
                console.log(`⚠️ No valid data found in file: ${file}`);
            }
        }
        
        console.log("\n✅ All seed data processed successfully!");
    } catch (error) {
        console.error("❌ Error in seedData:", error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
};

seedData();
