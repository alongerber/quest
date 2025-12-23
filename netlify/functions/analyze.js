// Netlify Serverless Function - מנוע ניתוח מערכתי קוראל
// פונקציה זו מקבלת נתוני סקר ומחזירה תובנות מערכת

exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from environment variable
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured. Please add ANTHROPIC_API_KEY in Netlify environment variables.' })
    };
  }

  try {
    const { responses, summaryData } = JSON.parse(event.body);

    if (!responses || responses.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'No data provided' })
      };
    }

    // Build detailed data from all responses
    const detailedResponses = responses.map(r => {
      return `
עובד: ${r.name} | מחלקה: ${r.department || r.department_other || 'לא צוין'} | תפקיד: ${r.role || 'לא צוין'}
- מיילים ביום: ${r.emails_count || 'לא צוין'}
- כלים: ${(r.tools || []).join(', ') || 'לא צוין'}
- סוג תהליך: ${r.process_type === 'rule_based' ? 'קבוע (תמיד אותו דבר)' : r.process_type === 'mixed' ? 'מעורב' : 'דורש חשיבה'}
- מספר מערכות: ${r.tools_switching_count || 'לא צוין'}
- מה מתסכל: ${r.main_frustration || 'לא צוין'}
- רעיון לשיפור: ${r.process_wish || 'לא צוין'}
`;
    }).join('\n---\n');

    const dataDescription = `
נתוני סקר התייעלות - קוראל שירותי ים:
- ${summaryData.totalResponses} עובדים ענו על השאלון
- סה"כ כ-${summaryData.totalHours} שעות עבודה שבועיות בתהליכים חוזרים (הערכה)

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
            content: `אתה יועץ התייעלות. קיבלת נתונים מסקר עובדים. כתוב דוח קצר ומעשי.

חשוב: הנתונים מבוססים על הערכות עצמיות של עובדים, לא על מדידות מדויקות. אל תציג מספרים כאילו הם מדויקים.

${dataDescription}

כתוב דוח בעברית עם:

1. **סיכום קצר** (3-4 משפטים) - מה המצב הכללי?

2. **ממצאים עיקריים** (3-4 נקודות) - מה בולט מהתשובות?

3. **המלצות מעשיות** (3-4 פעולות) - מה כדאי לעשות קודם? התמקד בכלי AI ואוטומציה קונקרטיים (Copilot, Power Automate, OCR).

4. **צעד ראשון מומלץ** - פעולה אחת פשוטה להתחיל בה.

כתוב בשפה פשוטה ומעשית. אל תשתמש במונחים טכניים מיותרים.`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Claude API error:', errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'שגיאה בחיבור ל-API', details: errorData })
      };
    }

    const data = await response.json();
    const aiResponse = data.content[0].text;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        analysis: aiResponse
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', message: error.message })
    };
  }
};
