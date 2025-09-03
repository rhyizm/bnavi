# 部材費/機器費マスタ

## ローカル環境での実行方法

開発サーバーを起動するには、以下のコマンドを実行します:

```bash
npm run dev
# or
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、結果が表示されます。

## データ初期化手順

データベースを初期化し、シードデータを投入するには、以下の手順に従います。

1.  **データファイルの準備**:
    *   `prisma/data/` ディレクトリ内に `component_master.csv` という名前のCSVファイルを作成します。
    *   CSVファイルには以下のカラムが必要です:
        *   `updated`: 最終更新日 (例: `YYYY/MM/DD` または `YYYY-MM-DD`)。
        *   `name`: 部品名。
        *   `code`: 部品コード。
        *   `price`: 部品価格 (数値)。

2.  **データベースのリセットとシードコマンドの実行**:
    *   このコマンドはデータベースをリセットし、その後シードスクリプト (`prisma/seed.ts`) を実行して `ComponentMaster` テーブルにデータを投入します。
    ```bash
    npx prisma migrate reset --force
    ```

    *   シードスクリプトは以下の処理を行います:
        *   `prisma/data/component_master.csv` からデータを読み込みます。
        *   テキストフィールドを正規化します (例: 全角文字を半角文字に変換、スペースのトリミング)。
        *   日付フィールドを解析します。
    *   `ComponentMaster` テーブルにデータを挿入します。

### データシード条件

- 文字コード: UTF-8（BOMなし）
- 配置場所: `prisma/data/` ディレクトリ直下
- 対応ファイル名（カテゴリ自動判定）:
  - 部材費: `部材費.csv` または `部材費マスタ.csv`
  - 機器費: `機器費.csv` または `機器費マスタ.csv`
- ヘッダ（推奨）: `code,original_name,price,updated`
  - 日本語ヘッダも可: `品番コード`→code, `製品名`→name, `機器単価`→price
  - `updated` 列は英字の `updated` を使用してください
- 値の形式:
  - `updated`: `YYYY-MM-DD`, `YYYY/MM/DD`, または `YYYYMMDD`
  - `price`: 数値（カンマ区切りなし。例: `971000`）
  - `code`: 文字列（前後空白は自動トリム）
- name の扱い: `original_name` を正規化した値を `name` として保存し、元の文字列は `originalName` に保存します。
- 実行時挙動: ファイルごとに同カテゴリの既存レコードを削除してから一括投入します（`createMany`）。

## マスターデータあいまい検索エンドポイント

このプロジェクトには、部品情報を検索するためのAPIエンドポイント `/api/components/fuzzy-search` が用意されています。

### 認証

APIを利用するには、リクエストヘッダーにAPIキーを含める必要があります。

1.  プロジェクトのルートディレクトリに `.env` ファイルを作成（または既存のファイルに追記）します。
2.  以下の形式でAPIキーを設定します:
    ```
    API_SECRET_KEY="YOUR_ACTUAL_API_KEY"
    ```
    `YOUR_ACTUAL_API_KEY` は、実際に使用する秘密のキーに置き換えてください。
    **注意:** `.env` ファイルは、セキュリティのため `.gitignore` に追加してリポジトリにコミットしないようにしてください。

### リクエスト

GETリクエストを `/api/components/search` に対して行います。

**ヘッダー:**

*   `x-api-key`: `.env` で設定した `API_SECRET_KEY` の値。

**クエリパラメータ:**

*   `query` (文字列, オプション): 検索するキーワード。指定しない場合のデフォルトは `'ケーブル600VCV14Sq-3C'` です。
*   `method` (文字列, オプション): 検索アルゴリズム。`'levenshtein'` (デフォルト) または `'trigram'` を指定できます。
*   `limit` (数値, オプション): 返される結果の最大数。デフォルトは `10` です。
*   `category[]` (string[], optional): 検索対象のカテゴリを配列で指定します。指定しない場合はすべてのカテゴリが対象となります。例: `category[]=部材費&category[]=機器費`
### 使用例 (curl)

開発サーバーがローカルのポート3000で実行されていると仮定します。

```bash
curl -H "x-api-key: YOUR_ACTUAL_API_KEY" "http://localhost:3000/api/components/fuzzy-search?query=ケーブル&limit=5"
```
上記のコマンドでは、`YOUR_ACTUAL_API_KEY` を `.env` に設定した実際のAPIキーに置き換えてください。

レスポンス例

```json
{
  "results": [
    {
      "id": 10462,
      "code": "4607010006",
      "name": "ケーブル埋設標(信号ケーブル　ＪＲ用)",
      "normalizedName": "ケーブル埋設標(信号ケーブル JR用)",
      "price": 2940,
      "category": "部材費",
      "score": 0.29411766,
      "method": "trigram",
      "source": "component"
    },
    {
      "id": 1096,
      "code": "4003241180",
      "name": "ＫＰＥＶ　ケーブル(２ｍｍ２　２Ｐ)",
      "normalizedName": "KPEV ケーブル(2mm2 2P)",
      "price": 226,
      "category": "部材費",
      "score": 0.29411766,
      "method": "trigram",
      "source": "component"
    }
    /* …最大 limit 件 */
  ],
  "method": "trigram"
}

```

## VendorMasterMapping API エンドポイント

このプロジェクトには、ベンダーマスターマッピング情報を管理するためのCRUD APIエンドポイントが用意されています。

### エンドポイント一覧

#### 1. マッピング一覧の取得
**GET** `/api/vendor-master-mappings`

ページネーション付きでマッピング一覧を取得します。

**クエリパラメータ:**
- `page` (数値, オプション): ページ番号。デフォルトは `1`。
- `limit` (数値, オプション): 1ページあたりの件数。デフォルトは `10`。

**レスポンス例:**
```json
{
  "data": [
    {
      "id": 1,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z",
      "vendor_name": "ベンダーA",
      "component_name_ocr": "ケーブル600VCV14Sq-3C",
      "component_name_corrected": "ケーブル 600V CV 14Sq-3C",
      "master_code_expected": "CABLE001",
      "master_name_expected": "CVケーブル14sq 3芯",
      "master_code": "CABLE001",
      "master_name": "CVケーブル14sq 3芯",
      "category": "部材費",
      "metadata": null
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

#### 2. 特定のマッピングの取得
**GET** `/api/vendor-master-mappings/[id]`

指定したIDのマッピング情報を取得します。

**レスポンス例:**
```json
{
  "id": 1,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z",
  "vendor_name": "ベンダーA",
  "component_name_ocr": "ケーブル600VCV14Sq-3C",
  "component_name_corrected": "ケーブル 600V CV 14Sq-3C",
  "master_code_expected": "CABLE001",
  "master_name_expected": "CVケーブル14sq 3芯",
  "master_code": "CABLE001",
  "master_name": "CVケーブル14sq 3芯",
  "category": "部材費",
  "metadata": null
}
```

#### 3. 新規マッピングの作成
**POST** `/api/vendor-master-mappings`

新しいマッピングを作成します。指定された `master_code` が `component_master` テーブルに存在しない場合、警告メッセージがレスポンスに含まれます。

**データクレンジング:**
- すべての文字列フィールドは自動的にトリムされます（前後の空白を削除）
- 連続する空白文字は単一のスペースに正規化されます

**リクエストボディ:**
```json
{
  "vendor_name": "ベンダーB",
  "component_name_ocr": "スイッチ埋込SW",
  "component_name_corrected": "スイッチ 埋込 SW",
  "master_code_expected": "SW001",
  "master_name_expected": "埋込スイッチ",
  "master_code": "SW001",
  "master_name": "埋込スイッチ",
  "category": "部材費",
  "metadata": {
    "note": "追加情報"
  }
}
```

**必須フィールド:**
- `master_code`: マスターコード（必須）

**オプションフィールド:**
- `vendor_name`: ベンダー名
- `component_name_ocr`: OCRで読み取った部品名
- `component_name_corrected`: 修正された部品名
- `master_code_expected`: 期待されるマスターコード
- `master_name_expected`: 期待されるマスター名
- `master_name`: マスター名
- `category`: カテゴリ（デフォルト: "部材費"）
- `metadata`: メタデータ（JSON形式）

**レスポンス例（master_codeが存在する場合）:**
```json
{
  "id": 2,
  "created_at": "2024-01-02T00:00:00.000Z",
  "updated_at": "2024-01-02T00:00:00.000Z",
  "vendor_name": "ベンダーB",
  "component_name_ocr": "スイッチ埋込SW",
  "component_name_corrected": "スイッチ 埋込 SW",
  "master_code_expected": "SW001",
  "master_name_expected": "埋込スイッチ",
  "master_code": "SW001",
  "master_name": "埋込スイッチ",
  "category": "部材費",
  "metadata": {
    "note": "追加情報"
  }
}
```

**レスポンス例（master_codeが存在しない場合）:**
```json
{
  "id": 3,
  "created_at": "2024-01-02T00:00:00.000Z",
  "updated_at": "2024-01-02T00:00:00.000Z",
  "vendor_name": "ベンダーC",
  "component_name_ocr": "新規部品",
  "component_name_corrected": "新規部品",
  "master_code_expected": "NEW001",
  "master_name_expected": "新規部品",
  "master_code": "NEW001",
  "master_name": "新規部品",
  "category": "部材費",
  "metadata": null,
  "warning": "Master code 'NEW001' does not exist in component_master table"
}
```

#### 4. マッピングの更新
**PUT** `/api/vendor-master-mappings/[id]`

指定したIDのマッピング情報を更新します。

**リクエストボディ:**
更新したいフィールドのみを含めることができます。
```json
{
  "master_name": "CVケーブル14sq 3芯（更新）",
  "category": "電気部材"
}
```

#### 5. マッピングの削除
**DELETE** `/api/vendor-master-mappings/[id]`

指定したIDのマッピングを削除します。

**レスポンス例:**
```json
{
  "message": "Vendor master mapping deleted successfully"
}
```

### 使用例 (curl)

```bash
# マッピング一覧の取得
curl -H "x-api-key: YOUR_ACTUAL_API_KEY" \
  "http://localhost:3000/api/vendor-master-mappings?page=1&limit=20"

# 特定のマッピングの取得
curl -H "x-api-key: YOUR_ACTUAL_API_KEY" \
  "http://localhost:3000/api/vendor-master-mappings/1"

# 新規マッピングの作成
curl -X POST "http://localhost:3000/api/vendor-master-mappings" \
  -H "x-api-key: YOUR_ACTUAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_name": "ベンダーC",
    "component_name_ocr": "コンセント2P15A",
    "master_code": "OUTLET001",
    "master_name": "2P15Aコンセント"
  }'

# マッピングの更新
curl -X PUT "http://localhost:3000/api/vendor-master-mappings/1" \
  -H "x-api-key: YOUR_ACTUAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "master_name": "2P15Aコンセント（更新）"
  }'

# マッピングの削除
curl -X DELETE "http://localhost:3000/api/vendor-master-mappings/1" \
  -H "x-api-key: YOUR_ACTUAL_API_KEY"
```

### エラーレスポンス

すべてのエンドポイントは、エラーが発生した場合に適切なHTTPステータスコードとエラーメッセージを返します。

**例:**
```json
{
  "error": "Vendor master mapping not found"
}
```

**一般的なステータスコード:**
- `200`: 成功
- `201`: 作成成功
- `400`: 不正なリクエスト（無効なID形式など）
- `404`: リソースが見つからない
- `500`: サーバーエラー

  ## マッピング-マスター横断検索エンドポイント

ベンダーマスターマッピングテーブルとマスターデータのあいまい検索を組み合わせた検索を行うAPIエンドポイント`/api/search`が用意されています。
以下のデータを結合した配列データを取得できます。

- 指定した`query`を正規化した値で`vendor_master_mapping`の`component_name_ocr`を検索し、完全一致したレコードの`master_code`をマスターデータから取得したデータ。(scoreは1になります)
- 指定した`query`を正規化した値で`api/components/fuzzy-search`のあいまい検索を実行した時と同じデータ。

データはスコアで降順ソートされます。

### 認証

APIを利用するには、リクエストヘッダーにAPIキーを含める必要があります。

1.  プロジェクトのルートディレクトリに `.env` ファイルを作成（または既存のファイルに追記）します。
2.  以下の形式でAPIキーを設定します:
    ```
    API_SECRET_KEY="YOUR_ACTUAL_API_KEY"
    ```
    `YOUR_ACTUAL_API_KEY` は、実際に使用する秘密のキーに置き換えてください。
    **注意:** `.env` ファイルは、セキュリティのため `.gitignore` に追加してリポジトリにコミットしないようにしてください。

### リクエスト

GETリクエストを `/api/search` に対して行います。

**ヘッダー:**

*   `x-api-key`: `.env` で設定した `API_SECRET_KEY` の値。

**クエリパラメータ:**

*   `query` (文字列, オプション): 検索するキーワード。指定しない場合のデフォルトは `'ケーブル600VCV14Sq-3C'` です。
*   `vendor` (文字列, オプション): マッピングテーブルの検索で vendor_name による絞り込みを行います。
*   `method` (文字列, オプション): 検索アルゴリズム。`'trigram'` (デフォルト) または `'levenshtein'` を指定できます。
*   `limit` (数値, オプション): 返される結果の最大数。デフォルトは `10` です。
*   `category[]` (string[], optional): 検索対象のカテゴリを配列で指定します。指定しない場合はすべてのカテゴリが対象となります。例: `category[]=部材費&category[]=機器費`

## 詳細情報

Next.js についてさらに学ぶには、以下のリソースをご覧ください:

- [Next.js ドキュメント](https://nextjs.org/docs) - Next.js の機能と API について学びます。
- [Learn Next.js](https://nextjs.org/learn) - インタラクティブな Next.js のチュートリアルです。

[Next.js GitHub リポジトリ](https://github.com/vercel/next.js) をチェックしてみてください - フィードバックやコントリビューションを歓迎します！

## デプロイ方法

### Vercel プラットフォームを利用する場合
Next.js アプリをデプロイする最も簡単な方法は、Next.js の作成者による [Vercel プラットフォーム](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) を使用することです。

詳細については、[Next.js デプロイメントドキュメント](https://nextjs.org/docs/app/building-your-application/deploying) を確認してください。

### Vercel CLI を利用する場合
Vercel CLI を使用してローカル端末からデプロイすることも可能です。

1.  **Vercel CLI のインストール**:
    ```bash
    npm install -g vercel
    # or
    yarn global add vercel
    # or
    pnpm add -g vercel
    ```

2.  **Vercel へのログイン**:
    ```bash
    vercel login
    ```
    ブラウザが開き、Vercel アカウントへのログインを求められます。

3.  **プロジェクトのデプロイ**:
    プロジェクトのルートディレクトリで以下のコマンドを実行します。
    ```bash
    vercel
    ```
    初めてデプロイする場合、プロジェクト名や設定についていくつか質問されます。
    既存のプロジェクトにリンクする場合は、`vercel link` コマンドを使用できます。

4.  **プレビュー/プロダクションデプロイ**:
    *   プレビューデプロイ:
        ```bash
        vercel deploy --target=preview
        ```
    *   プロダクションデプロイ:
        ```bash
        vercel --prod
        ```

詳細については、[Vercel CLI ドキュメント](https://vercel.com/docs/cli) を参照してください。
