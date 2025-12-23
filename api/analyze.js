// Vercel Serverless Function - Claude AI Analysis
// This function receives survey data and returns AI-generated insights

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { responses, summaryData } = req.body;

    if (!responses || responses.length === 0) {
      return res.status(400).json({ error: 'No data provided' });
    }

    // Build detailed data from all responses
    const detailedResponses = responses.map(r => {
      return `
עובד: ${r.name} | מחלקה: ${r.department || r.department_other || 'לא צוין'} | תפקיד: ${r.role || 'לא צוין'} | ותק: ${r.seniority || 'לא צוין'}
- פעילויות: ${(r.activities || []).join(', ') || 'לא צוין'}
- מיילים ביום: ${r.emails_count || 'לא צוין'} | דורשים העתקה: ${r.emails_copy || 'לא צוין'} | מיילים נופלים: ${r.emails_missed || 'לא צוין'}
- כלים: ${(r.tools || []).join(', ') || 'לא צוין'}
- העתקות בין כלים: ${r.tools_copy_between || 'לא צוין'}
- סוג תהליך: ${r.process_type === 'rule_based' ? 'קבוע (תמיד אותו דבר)' : r.process_type === 'mixed' ? 'מעורב' : r.process_type === 'human_judgment' ? 'דורש חשיבה' : 'לא צוין'}
- תדירות: ${r.process_frequency === 'daily' ? 'יומי' : r.process_frequency === 'weekly' ? 'שבועי' : r.process_frequency === 'monthly' ? 'חודשי' : 'לא צוין'}
- מספר כלים שעובר ביניהם: ${r.tools_switching_count || 'לא צוין'}
- פעולה חוזרת: ${r.most_repeated_action || 'לא צוין'}
- מה מבזבז זמן: ${r.biggest_time_waste || 'לא צוין'}
- מה הכי מתסכל: ${r.main_frustration || 'לא צוין'}
- רעיון לשיפור: ${r.improvement_idea || 'לא צוין'}
- מה רוצה שישתפר: ${r.process_wish || 'לא צוין'}
- שלבים ידניים: ${r.manual_steps || 'לא צוין'}
${r.ships_per_week ? `- אניות בשבוע: ${r.ships_per_week}` : ''}
${r.cargo_per_week ? `- תיקי מטען בשבוע: ${r.cargo_per_week}` : ''}
${r.manifest_per_week ? `- מניפסטים בשבוע: ${r.manifest_per_week}` : ''}
${r.bol_per_week ? `- שטרי מטען בשבוע: ${r.bol_per_week}` : ''}
${r.inquiries_per_day ? `- פניות ביום: ${r.inquiries_per_day}` : ''}
`;
    }).join('\n---\n');

    // Build a summary of the data for Claude
    const dataDescription = `
נתוני סקר התייעלות - קוראל שירותי ים:

=== סיכום כללי ===
- ${summaryData.totalResponses} עובדים ענו על השאלון
- סה"כ ${summaryData.totalHours} שעות עבודה שבועיות בתהליכים חוזרים
- ציון פוטנציאל לייעול ממוצע: ${summaryData.avgScore}/100

=== פירוט לפי מחלקות ===
${summaryData.deptBreakdown}

=== כלים בשימוש ===
${summaryData.tools}

=== כל התשובות המפורטות ===
${detailedResponses}
`;

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `אתה יועץ התייעלות תהליכים בחברת ספנות ישראלית. קיבלת נתונים מסקר עובדים שמטרתו למצוא תהליכים שאפשר לייעל.

קרא בעיון את כל הנתונים הבאים:

${dataDescription}

נתח את המידע וספק תשובה מקיפה בעברית:

## 1. מה גילינו? (תובנות עיקריות)
זהה 3-4 דברים בולטים מהנתונים - מה חוזר על עצמו? מה מתסכל כמה עובדים?

## 2. איפה הבעיות הגדולות?
על סמך התשובות, איפה נראה שיש הכי הרבה עבודה מיותרת או בזבוז זמן?

## 3. מה אפשר לעשות? (המלצות לפי עדיפות)
4-5 המלצות קונקרטיות. התחל מהדבר הכי חשוב.

## 4. דברים שקל לתקן מהר
2-3 שיפורים פשוטים שאפשר לעשות כבר עכשיו.

## 5. שורה תחתונה (סיכום קצר למנהלים)
2-3 משפטים שמסכמים את המצב ומה הכי חשוב לטפל בו.

כתוב בשפה פשוטה וברורה, כאילו אתה מסביר לבעל החברה שלא מבין במחשבים.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return res.status(500).json({ error: 'AI service error', details: errorData });
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return res.status(200).json({
      success: true,
      analysis: aiResponse
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error', message: error.message });
  }
}
