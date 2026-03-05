
// 辅助函数：规范化文本格式
function normalizeText(text: string): string {
  if (!text) return '';

  return text
    .replace(/(-\s[^\n]+)\n+(-\s)/g, '$1\n$2') // 列表项之间只保留一个换行符
    .replace(/\n+$/, '') // 去掉结尾的多余换行符
    .replace(/^\n+/, ''); // 去掉开头的多余换行符
}

export { normalizeText };