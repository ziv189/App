import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ dangerouslyAllowBrowser: true })

const SYSTEM_PROMPT = `You are a game master turning study material into an RPG adventure.
Analyze the provided study material and return a JSON object. Return ONLY valid JSON — no markdown fences, no explanation.`

const USER_PROMPT_TEMPLATE = (text) => `
Analyze this study material and return a JSON object with EXACTLY this structure:

{
  "chapters": [
    {
      "title": "Short RPG-style chapter title",
      "lore": "2-3 sentences written as RPG quest flavor text that summarizes this section",
      "flashcards": [
        { "term": "Key term or concept", "definition": "Clear explanation in 1-2 sentences" }
      ],
      "quiz": [
        {
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 0,
          "explanation": "Brief explanation of why the answer is correct"
        }
      ]
    }
  ]
}

Rules:
- Create 4-6 chapters that cover the material logically
- Each chapter must have 8-10 flashcard pairs
- Each chapter must have exactly 5 multiple-choice questions
- Lore must sound like an epic RPG quest description (e.g. "A dark fog of confusion surrounds...")
- Chapter titles should be dramatic RPG names (e.g. "The Ancient Laws of Thermodynamics")
- correctIndex is 0-based index into options array
- Return ONLY the JSON object, nothing else

Study material:
---
${text}
---`

export async function parseStudyMaterial(text) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: USER_PROMPT_TEMPLATE(text),
      },
    ],
    system: SYSTEM_PROMPT,
  })

  const raw = message.content[0].text.trim()

  // Strip markdown code fences if the model adds them anyway
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  const parsed = JSON.parse(jsonStr)

  if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
    throw new Error('Invalid response structure from AI')
  }

  return parsed
}
