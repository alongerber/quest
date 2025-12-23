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

    // Build a summary of the data for Claude
    const dataDescription = `
נתוני סקר התייעלות - קוראל שירותי ים:

סיכום כללי:
- ${summaryData.totalResponses} עובדים ענו על השאלון
- סה"כ ${summaryData.totalHours} שעות עבודה שבועיות בתהליכים חוזרים
- מדד חיכוך ממוצע: ${summaryData.avgScore}/100

פירוט לפי מחלקות:
${summaryData.deptBreakdown}

נקודות כאב שדווחו:
${summaryData.painPoints}

כלים בשימוש:
${summaryData.tools}

מה העובדים היו רוצים שישתפר:
${summaryData.wishes}
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
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `אתה יועץ התייעלות תהליכים בחברת ספנות. קיבלת את הנתונים הבאים מסקר עובדים:

${dataDescription}

אנא ספק ניתוח מעמיק בעברית הכולל:

1. **תובנות מרכזיות** (3-4 תובנות חשובות מהנתונים)

2. **צווארי בקבוק** (איפה נראה שיש הכי הרבה בזבוז זמן)

3. **המלצות מעשיות** (4-5 המלצות קונקרטיות לייעול, מדורגות לפי עדיפות)

4. **Quick Wins** (2-3 דברים שאפשר לשפר מהר וקל)

5. **סיכום להנהלה** (2-3 משפטים תמציתיים)

כתוב בשפה פשוטה וברורה, בלי מונחים טכניים מיותרים.`
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
