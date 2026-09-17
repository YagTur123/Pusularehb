import { Session, Student } from '../types';
import { formatTurkishDate, getWeekDays } from './storage';

// Helper to pad string taking visual width into account
function padEndVis(str: string, targetLen: number): string {
  if (str.length > targetLen) {
    return str.slice(0, targetLen - 1) + '…';
  }
  return str + ' '.repeat(targetLen - str.length);
}

// Helper to center string in target column width
function centerVis(str: string, targetLen: number): string {
  if (str.length >= targetLen) return str.slice(0, targetLen);
  const leftPad = Math.floor((targetLen - str.length) / 2);
  const rightPad = targetLen - str.length - leftPad;
  return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
}

export interface BroadcastOptions {
  includeTags?: boolean;
  includeCounselor?: boolean;
  onlyAssigned?: boolean;
}

/**
 * Generate Modern Executive Schedule Cards (Mobile WhatsApp Native)
 * Fits perfectly on phone screens without horizontal scroll or breaking!
 */
export function generateModernCardBroadcastText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string,
  options: BroadcastOptions = { includeTags: true, includeCounselor: true, onlyAssigned: true }
): string {
  const hasAssigned = sessions.some((s) => s.student_id);
  const shouldFilterAssigned = options.onlyAssigned !== false && hasAssigned;
  const targetSessions = (shouldFilterAssigned
    ? sessions.filter((s) => s.student_id)
    : sessions
  ).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);
  const studentMap = new Map(students.map((st) => [st.id, st]));
  const taggedStudents: { name: string; phone: string }[] = [];

  const cards = targetSessions.map((sess, idx) => {
    const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
    const name = student ? student.full_name : 'Boş Seans (Müsait)';
    const grade = student ? ` (${student.class_grade})` : '';
    const topic = sess.topic.trim() || 'Genel Değerlendirme & Takip';
    const tags = sess.tags && sess.tags.length > 0 ? ` [${sess.tags.join(', ')}]` : '';
    
    // Status emoji
    const statusMark = sess.status === 'Geldi' ? '✅' : sess.status === 'Gelmedi' ? '❌' : '⏳';

    if (student && student.phone) {
      if (!taggedStudents.some((t) => t.phone === student.phone)) {
        taggedStudents.push({
          name: student.full_name,
          phone: student.phone,
        });
      }
    }

    return `🔹 *${sess.time_slot}* │ *${name}*${grade}\n   🎯 *Konu:* ${topic}${tags}\n   ${statusMark} *Durum:* ${sess.status}`;
  });

  const cardsContent =
    cards.length > 0
      ? cards.join('\n\n')
      : '_Bu tarih için planlanmış görüşme bulunmamaktadır._';

  let tagsSection = '';
  if (options.includeTags && taggedStudents.length > 0) {
    tagsSection = '\n\n👥 *Görüşmeye Çağrılan Öğrenciler:*\n' +
      taggedStudents
        .map((t) => `@+${t.phone.replace(/\D/g, '')} (${t.name})`)
        .join('\n');
  }

  const counselorLine = options.includeCounselor && counselorName
    ? `👤 *Danışman:* ${counselorName}\n`
    : '';

  return `🏛 *PUSULA REHBERLİK SERVİSİ | GÜNLÜK SEANS PROGRAMI*
📅 *Tarih:* ${dateFormatted}
${counselorLine}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${cardsContent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${tagsSection}

📌 *Önemli Bilgilendirme:*
• Lütfen seans saatinizden 5 dakika önce rehberlik servisinde hazır bulununuz.
• Katılamayacak veya derste sınavı olan öğrencilerin önceden bilgi vermesi rica olunur.`;
}

/**
 * Generate Group Broadcast Message with Clean Mobile-Optimized Monospaced Table (max 34 chars)
 */
export function generateGroupBroadcastText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string,
  options: BroadcastOptions = { includeTags: true, includeCounselor: true, onlyAssigned: true }
): string {
  const hasAssigned = sessions.some((s) => s.student_id);
  const shouldFilterAssigned = options.onlyAssigned !== false && hasAssigned;
  const targetSessions = (shouldFilterAssigned
    ? sessions.filter((s) => s.student_id)
    : sessions
  ).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);
  const studentMap = new Map(students.map((st) => [st.id, st]));

  // Mobile-safe widths: SAAT (5), ÖĞRENCİ (15), KONU (12) -> Total: 1 + 5 + 1 + 15 + 1 + 12 + 1 = 36 chars!
  const colTime = 5;
  const colStudent = 15;
  const colTopic = 12;

  const topBorder = `┌${'─'.repeat(colTime)}┬${'─'.repeat(colStudent)}┬${'─'.repeat(colTopic)}┐`;
  const headerLine = `│${centerVis('SAAT', colTime)}│${centerVis('ÖĞRENCİ', colStudent)}│${centerVis('KONU', colTopic)}│`;
  const midBorder = `├${'─'.repeat(colTime)}┼${'─'.repeat(colStudent)}┼${'─'.repeat(colTopic)}┤`;
  const botBorder = `└${'─'.repeat(colTime)}┴${'─'.repeat(colStudent)}┴${'─'.repeat(colTopic)}┘`;

  const rows: string[] = [];
  const taggedStudents: { name: string; phone: string }[] = [];

  targetSessions.forEach((sess) => {
    const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
    const timeDisplay = sess.time_slot.slice(0, 5);
    const studentNameGrade = student
      ? `${student.full_name} ${student.class_grade}`
      : 'Boş';
    const topicDisplay = sess.topic.trim() || 'Rutin Takip';

    rows.push(
      `│${centerVis(timeDisplay, colTime)}│ ${padEndVis(studentNameGrade, colStudent - 2)} │ ${padEndVis(topicDisplay, colTopic - 2)} │`
    );

    if (student && student.phone) {
      if (!taggedStudents.some((t) => t.phone === student.phone)) {
        taggedStudents.push({
          name: student.full_name,
          phone: student.phone,
        });
      }
    }
  });

  const tableRows =
    rows.length > 0
      ? rows.join('\n')
      : `│${centerVis('-', colTime)}│ ${padEndVis('Planlı seans yok', colStudent - 2)} │ ${padEndVis('-', colTopic - 2)} │`;

  const unicodeTable = `${topBorder}\n${headerLine}\n${midBorder}\n${tableRows}\n${botBorder}`;

  let tagsSection = '';
  if (options.includeTags && taggedStudents.length > 0) {
    tagsSection = '\n\n👥 *Görüşmesi Planlanan Öğrenciler:*\n' +
      taggedStudents
        .map((t) => `@+${t.phone.replace(/\D/g, '')} (${t.name})`)
        .join('\n');
  }

  const counselorLine = options.includeCounselor && counselorName
    ? `👤 *Danışman:* ${counselorName}\n`
    : '';

  return `🏛 *PUSULA REHBERLİK SERVİSİ | GÜNLÜK ÇİZELGE*
📅 *Tarih:* ${dateFormatted}
${counselorLine}
\`\`\`
${unicodeTable}
\`\`\`${tagsSection}

📌 *Hatırlatma:* Seans saatinden 5 dakika önce rehberlik servisine geliniz.`;
}

/**
 * Generate Simple Bullet List Broadcast
 */
export function generateSimpleListBroadcastText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string,
  options: BroadcastOptions = { includeTags: true, includeCounselor: true, onlyAssigned: true }
): string {
  const targetSessions = (options.onlyAssigned !== false
    ? sessions.filter((s) => s.student_id)
    : sessions
  ).sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);
  const studentMap = new Map(students.map((st) => [st.id, st]));

  const listItems = targetSessions.map((sess) => {
    const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
    const name = student ? `${student.full_name} (${student.class_grade})` : 'Boş';
    const topic = sess.topic.trim() ? ` — ${sess.topic.trim()}` : '';
    return `⏰ *${sess.time_slot}*: ${name}${topic}`;
  });

  const content =
    listItems.length > 0
      ? listItems.join('\n')
      : '_Bugün için planlanmış görüşme bulunmamaktadır._';

  const counselorLine = options.includeCounselor && counselorName
    ? `👤 *Danışman:* ${counselorName}\n`
    : '';

  return `🏛 *REHBERLİK SERVİSİ | GÜNLÜK GÖRÜŞME LİSTESİ*
📅 *Tarih:* ${dateFormatted}
${counselorLine}
${content}

📌 *Not:* Randevu saatinizden 5 dakika önce rehberlik servisinde olmanız rica olunur.`;
}

/**
 * Generate Full Week WhatsApp Schedule Announcement (Mon - Fri)
 */
export function generateWeeklyScheduleBroadcastText(
  baseDate: string,
  allSessions: Session[],
  students: Student[],
  counselorName?: string,
  options: BroadcastOptions = { includeCounselor: true }
): string {
  const weekDays = getWeekDays(baseDate, false);
  const studentMap = new Map(students.map((st) => [st.id, st]));

  const startDay = weekDays[0];
  const endDay = weekDays[weekDays.length - 1];
  const counselorLine = options.includeCounselor && counselorName
    ? `👤 *Danışman:* ${counselorName}\n`
    : '';

  const dayBlocks = weekDays.map((day) => {
    const daySessions = allSessions
      .filter((s) => s.date === day.date && s.student_id)
      .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

    let body = '';
    if (daySessions.length === 0) {
      body = '   _Görüşme planlanmadı_';
    } else {
      body = daySessions
        .map((s) => {
          const st = studentMap.get(s.student_id!);
          const name = st ? `${st.full_name} (${st.class_grade})` : '';
          const topic = s.topic ? ` - ${s.topic}` : '';
          return `   • *${s.time_slot}*: ${name}${topic}`;
        })
        .join('\n');
    }

    return `📅 *${day.dayName}, ${day.dayNumber} ${formatTurkishDate(day.date).split(' ')[1]}*\n${body}`;
  });

  return `🏛 *PUSULA REHBERLİK SERVİSİ | HAFTALIK SEANS PROGRAMI*
🗓 *Hafta:* ${startDay.dayNumber} - ${endDay.dayNumber} ${formatTurkishDate(baseDate).split(' ')[1]}
${counselorLine}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${dayBlocks.join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Önemli Bilgilendirme:*
• Tüm öğrencilerimizin belirtilen seans gün ve saatine riayet etmesi rica olunur.
• Acil randevu değişiklikleri için rehberlik servisine başvurunuz.`;
}

/**
 * Generate Formal Administrative / Parent Announcement
 */
export function generateParentNotificationText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string
): string {
  const assignedSessions = sessions
    .filter((s) => s.student_id)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);
  const studentMap = new Map(students.map((st) => [st.id, st]));

  const studentList = assignedSessions
    .map((sess) => {
      const student = sess.student_id ? studentMap.get(sess.student_id) : null;
      return student
        ? `• *${sess.time_slot}*: ${student.full_name} (${student.class_grade}) — ${sess.topic || 'Bireysel Görüşme'}`
        : '';
    })
    .filter(Boolean)
    .join('\n');

  return `Sayın Velilerimiz ve Değerli İdarecilerimiz,

${dateFormatted} tarihi itibarıyla Rehberlik ve Psikolojik Danışma Servisi kapsamında gerçekleştirilecek bireysel takip ve çalışma seansları aşağıda bilgilerinize sunulmuştur:

${studentList || 'Bugün için planlı görüşme bulunmamaktadır.'}

Öğrencilerimizin akademik gelişimleri, motivasyonları ve sınav hazırlıkları (YKS/LGS) titizlikle izlenmektedir.

İyi çalışmalar dileriz.
*${counselorName || 'Rehberlik ve Psikolojik Danışma Servisi'}*`;
}

/**
 * Generate 1-on-1 Session Summary Card for a Student
 */
export function generateIndividualSummaryText(
  session: Session,
  student: Student,
  counselorName?: string
): string {
  const dateFormatted = formatTurkishDate(session.date);
  const tagsStr = session.tags.length > 0 ? session.tags.join(', ') : 'Rutin Takip';
  const actionItems = session.action_items.trim()
    ? session.action_items.trim()
    : '• Belirlenen haftalık ders çalışma rutinine uyulacak.\n• Düzenli soru ve branş denemesi takibi yapılacak.';

  const nextDateFormatted = session.next_followup_date
    ? formatTurkishDate(session.next_followup_date)
    : 'Rehberlik birimi tarafından duyurulacaktır.';

  return `🏛 *PUSULA REHBERLİK | BİREYSEL GÖRÜŞME KARTI*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *Öğrenci:* ${student.full_name} (${student.class_grade})
📅 *Tarih & Saat:* ${dateFormatted} - ${session.time_slot}
👨‍🏫 *Danışman:* ${counselorName || 'Rehberlik Servisi'}
🎯 *Görüşme Konusu:* ${session.topic || 'Genel Değerlendirme'}
🏷️ *Odak:* ${tagsStr}

📝 *Alınan Kararlar ve Ödevler:*
${actionItems}

🔄 *Sonraki Takip Randevusu:* ${nextDateFormatted}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Verimli ve başarılı bir çalışma dönemi dileriz._`;
}

/**
 * Generate "Gelmedi" Auto-Reminder Message
 */
export function generateMissedSessionReminderText(
  student: Student,
  session: Session
): string {
  return `Sayın Veli / Sevgili ${student.full_name}, bugün saat ${session.time_slot} için planlanan rehberlik görüşmesine katılım sağlanamadığı tespit edilmiştir. YKS/LGS hazırlık ve akademik takibinizin aksamaması adına lütfen telafi randevusu için rehberlik servisine başvurunuz.`;
}

/**
 * Create WhatsApp Direct Link (compatible with desktop, web, and mobile app)
 */
export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

/**
 * Open WhatsApp Web with text
 */
export function getWhatsAppWebShareUrl(text: string): string {
  return `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Universal WhatsApp share link (works on desktop, mobile, tablet)
 */
export function getWhatsAppUniversalUrl(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

/**
 * Generate Official Output Broadcast Message with Tagged Phone Numbers
 * Specifically designed to accompany the official interview schedule screenshot/image
 */
export function generateOfficialTaggedBroadcastText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string
): string {
  const targetSessions = sessions
    .filter((s) => s.student_id)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);
  const studentMap = new Map(students.map((st) => [st.id, st]));
  const taggedStudents: { name: string; grade: string; time: string; phone: string }[] = [];

  targetSessions.forEach((sess) => {
    const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
    if (student && student.phone) {
      const cleanPhone = student.phone.replace(/\D/g, '');
      const formattedPhone = cleanPhone.startsWith('90')
        ? cleanPhone
        : cleanPhone.startsWith('0')
        ? '9' + cleanPhone
        : '90' + cleanPhone;

      if (!taggedStudents.some((t) => t.phone === formattedPhone && t.time === sess.time_slot)) {
        taggedStudents.push({
          name: student.full_name,
          grade: student.class_grade,
          time: sess.time_slot,
          phone: formattedPhone,
        });
      }
    }
  });

  const counselorLine = counselorName ? `👤 *Danışman:* ${counselorName}\n` : '';

  let tagsBlock = '';
  if (taggedStudents.length > 0) {
    tagsBlock =
      '👥 *Görüşmeye Çağrılan Öğrenci & Veliler (Etiketler):*\n' +
      taggedStudents
        .map((t) => `@+${t.phone} (${t.time} — ${t.name}, ${t.grade})`)
        .join('\n');
  } else {
    tagsBlock = '_Bugün için randevulu öğrenci bulunmamaktadır._';
  }

  return `🏛 *T.C. MİLLÎ EĞİTİM BAKANLIĞI*
*REHBERLİK VE PSİKOLOJİK DANIŞMA SERVİSİ*
📄 *GÜNLÜK RESMİ GÖRÜŞME ÇİZELGESİ*
📅 *Tarih:* ${dateFormatted}
${counselorLine}📸 *Resmi Çizelge:* Yukarıdaki ekran görüntüsünde / belgede yer almaktadır.

${tagsBlock}

📌 *Hatırlatma:* Görüşme saatinizden 5 dakika önce rehberlik servisinde hazır bulunmanız rica olunur.`;
}

/**
 * Robust clipboard copy with textarea execCommand fallback for iframes
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback below
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    return false;
  }
}
