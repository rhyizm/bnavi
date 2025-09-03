-- extensionsスキーマ作成
CREATE SCHEMA IF NOT EXISTS extensions;

-- 既存拡張がpublicにあれば削除
DROP EXTENSION IF EXISTS fuzzystrmatch;
DROP EXTENSION IF EXISTS pg_trgm;

-- extensionsスキーマに再インストール
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA extensions;
