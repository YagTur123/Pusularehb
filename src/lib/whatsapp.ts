import { Session, Student } from '../types';
import { formatTurkishDate } from './storage';

// Helper to pad string taking visual width into account
function padEndVis(str: string, targetLen: number): string {
  if (str.length >= targetLen) {
    return str.slice(0, targetLen);
  }
  return str + ' '.repeat(targetLen - str.length);
}

/**
 * Generate Group Broadcast Message with ASCII Monospace Table
 */
export function generateGroupBroadcastText(
  dateStr: string,
  sessions: Session[],
  students: Student[],
  counselorName?: string
): string {
  // Only include sessions that have a student assigned
  const assignedSessions = sessions
    .filter((s) => s.student_id)
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  const dateFormatted = formatTurkishDate(dateStr);

  const studentMap = new Map(students.map((st) => [st.id, st]));

  // Table columns widths
  const colTime = 7;
  const colStudent = 20;
  const colTopic = 16;

  const borderLine = `+${'-'.repeat(colTime)}+${'-'.repeat(colStudent)}+${'-'.repeat(colTopic)}+`;
  const headerLine = `| ${padEndVis('SAAT', colTime - 2)} | ${padEndVis('ÖĞRENCİ', colStudent - 2)} | ${padEndVis('KONU', colTopic - 2)} |`;

  const rows: string[] = [];

  const taggedStudents: { name: string; phone: string }[] = [];

  assignedSessions.forEach((sess) => {
    const student = sess.student_id ? studentMap.get(sess.student_id) : undefined;
    const timeDisplay = sess.time_slot.slice(0, 5);
    const studentNameGrade = student
      ? `${student.full_name} (${student.class_grade})`
      : 'Boş';
    const topicDisplay = sess.topic.trim() || 'Genel Değerlendirme';

    rows.push(
      `| ${padEndVis(timeDisplay, colTime - 2)} | ${padEndVis(studentNameGrade, colStudent - 2)} | ${padEndVis(topicDisplay, colTopic - 2)} |`
    );

    if (student && student.phone) {
      // Avoid duplicate tags
      if (!taggedStudents.some((t) => t.phone === student.phone)) {
        taggedStudents.push({
          name: student.full_name,
          phone: student.phone,
        });
      }
    }
  });

  const tableRows = rows.length > 0
    ? rows.join('\n')
    : `| ${padEndVis('-', colTime - 2)} | ${padEndVis('Henüz randevu yok', colStudent - 2)} | ${padEndVis('-', colTopic - 2)} |`;

  const asciiTable = `${borderLine}\n${headerLine}\n${borderLine}\n${tableRows}\n${borderLine}`;

  let tagsSection = '';
  if (taggedStudents.length > 0) {
    tagsSection = taggedStudents
      .map((t) => `@+${t.phone} (${t.name})`)
      .join('\n');
  } else {
    tagsSection = '_Bugün için planlanmış öğrenci bulunmamaktadır._';
  }

  const broadcastMessage = `🧭 *PUSULA REHBERLİK SERVİSİ GÜNLÜK PROGRAMI*
🗓️ *Tarih:* ${dateFormatted}
${counselorName ? `👨‍🏫 *Danışman:* ${counselorName}\n` : ''}
\`\`\`
${asciiTable}
\`\`\`

🔔 *Görüşmesi Olan Öğrencilerimiz:*
${tagsSection}

⚠️ _Randevunuzdan 5 dakika önce rehberlik biriminde olunuz._`;

  return broadcastMessage;
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
    : '• Belirlenen haftalık ders programına uyulacak.\n• Düzenli soru takibi yapılacak.';

  const nextDateFormatted = session.next_followup_date
    ? formatTurkishDate(session.next_followup_date)
    : 'Rehberlik birimi tarafından duyurulacaktır.';

  return `🧭 *PUSULA REHBERLİK SERVİSİ | BİREYSEL SEANS KARTI*
━━━━━━━━━━━━━━━━━━━━━
👤 *Öğrenci:* ${student.full_name} (${student.class_grade})
📅 *Tarih & Saat:* ${dateFormatted} - ${session.time_slot}
👨‍🏫 *Rehber Öğretmen:* ${counselorName || 'Rehberlik Servisi'}
📌 *Görüşülen Konu:* ${session.topic || 'Genel Değerlendirme'}
🏷️ *Teşhis / Etiketler:* ${tagsStr}

🎯 *Haftalık Hedefler & Ödevler:*
${actionItems}

🗓️ *Bir Sonraki Randevu:* ${nextDateFormatted}
━━━━━━━━━━━━━━━━━━━━━
_Gelişimin ve hedeflerin için disiplini elden bırakma! Başarılar dileriz._`;
}

/**
 * Generate "Gelmedi" Auto-Reminder Message
 */
export function generateMissedSessionReminderText(
  student: Student,
  session: Session
): string {
  return `Merhaba ${student.full_name}, bugün saat ${session.time_slot} randevuna katılamadın. Lütfen yeni randevu oluşturmak için rehberlik servisine uğra.`;
}

/**
 * Create WhatsApp Web or Mobile Direct Link
 */
export function getWhatsAppDirectUrl(phone: string, text: string): string {
  const cleanPhone = phone.replace(/\D/g, '');
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
