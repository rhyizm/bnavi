export const normalizeText = (str: string): string => {
  return str
      .normalize("NFKC")  // **全角 → 半角変換 & 正規化**
      .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))  // 記号 & 英数字を半角化
      .replace(/　/g, " ")  // **全角スペース → 半角スペース**
      .replace(/[‐−‒–—―]/g, "-")  // **ハイフンの統一**
      .replace(/\s+/g, " ")  // **連続スペースを1つに統一**
      .trim();  // **前後のスペースを削除**
};
