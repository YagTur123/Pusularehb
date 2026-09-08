import { ParsedStudentRow, DIAGNOSTIC_TAGS } from '../types';
import { autoFormatPhone } from './storage';

export function parseBulkStudentText(rawInput: string): ParsedStudentRow[] {
  if (!rawInput.trim()) return [];

  const lines = rawInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const results: ParsedStudentRow[] = [];

  for (const line of lines) {
    // Check if header line
    const lower = line.toLowerCase();
    if (
      (lower.includes('ad') || lower.includes('isim')) &&
      (lower.includes('sınıf') || lower.includes('telefon') || lower.includes('grade'))
    ) {
      continue;
    }

    const parsed = parseSingleLine(line);
    results.push(parsed);
  }

  return results;
}

function parseSingleLine(line: string): ParsedStudentRow {
  // Try Tab-delimited (Excel copy paste)
  if (line.includes('\t')) {
    const parts = line.split('\t').map((p) => p.trim());
    if (parts.length >= 2) {
      const name = parts[0];
      const grade = parts[1] || '12-A';
      const phoneRaw = parts[2] || '';
      const tagsRaw = parts[3] || '';

      const phone = autoFormatPhone(phoneRaw);
      const tags = extractTags(tagsRaw);

      return {
        full_name: cleanName(name),
        class_grade: cleanGrade(grade),
        phone,
        tags,
        raw: line,
        valid: Boolean(name && phone.length >= 10),
        error: !name
          ? 'İsim eksik'
          : phone.length < 10
          ? 'Geçersiz telefon'
          : undefined,
      };
    }
  }

  // Regex based flexible parsing for messy lists
  // e.g.: "1. Ahmet Yılmaz - 12A - 0532 123 45 67 (Net Düşüşü)"
  // Extract phone number first
  const phoneMatch = line.match(/(?:\+?90|0)?\s*(?:5\d{2})\s*(?:\d{3})\s*(?:\d{2})\s*(?:\d{2})|(?:\+?90|0)?5\d{9}/);
  let phone = '';
  let lineWithoutPhone = line;

  if (phoneMatch) {
    phone = autoFormatPhone(phoneMatch[0]);
    lineWithoutPhone = line.replace(phoneMatch[0], ' ');
  }

  // Extract Grade: 12-A, 12A, 11-B, 10C, 9-D, Mezun, etc.
  const gradeMatch = lineWithoutPhone.match(/\b(12[- ]?[A-Za-z]|11[- ]?[A-Za-z]|10[- ]?[A-Za-z]|9[- ]?[A-Za-z]|Mezun|YKS[- ]?[A-Za-z]*)\b/i);
  let grade = '12-A';
  let lineWithoutGrade = lineWithoutPhone;

  if (gradeMatch) {
    grade = cleanGrade(gradeMatch[0]);
    lineWithoutGrade = lineWithoutPhone.replace(gradeMatch[0], ' ');
  }

  // Extract tags from bracket or keywords
  const tags = extractTags(line);

  // Clean name from remainder
  let cleanRemaining = lineWithoutGrade
    .replace(/^[\d\.\)\-\s]+/, '') // remove leading numbered bullets "1. " or "1) "
    .replace(/[\[\(\{\]\)\}]/g, ' ') // remove braces
    .replace(/[,;:\-]/g, ' ')
    .trim();

  // Strip diagnostic tags text from name if matched
  DIAGNOSTIC_TAGS.forEach((tag) => {
    cleanRemaining = cleanRemaining.replace(new RegExp(tag, 'gi'), '');
  });

  const nameParts = cleanRemaining.split(/\s+/).filter((w) => w.length > 0);
  const fullName = nameParts.slice(0, 4).join(' ');

  const isValid = fullName.length >= 3 && phone.length >= 10;
  const error = !fullName || fullName.length < 3
    ? 'İsim tespit edilemedi'
    : phone.length < 10
    ? 'Telefon numarası eksik (905xxxxxxxxx)'
    : undefined;

  return {
    full_name: cleanName(fullName),
    class_grade: grade,
    phone,
    tags,
    raw: line,
    valid: isValid,
    error,
  };
}

function cleanName(name: string): string {
  return name
    .trim()
    .replace(/[0-9\-_]/g, '')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
}

function cleanGrade(grade: string): string {
  const g = grade.trim().toUpperCase();
  if (g.includes('MEZ')) return 'Mezun';
  // If 12A -> 12-A
  const match = g.match(/^(\d{1,2})([A-Z])$/);
  if (match) {
    return `${match[1]}-${match[2]}`;
  }
  return g;
}

function extractTags(text: string): string[] {
  const matched: string[] = [];
  const lower = text.toLowerCase();

  DIAGNOSTIC_TAGS.forEach((tag) => {
    if (lower.includes(tag.toLowerCase())) {
      matched.push(tag);
    }
  });

  return matched;
}
