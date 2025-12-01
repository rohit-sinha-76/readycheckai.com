/**
 * Gemini AI Client for Roadmap Generation
 * 
 * This module handles all communication with Google's Gemini AI API
 * IMPORTANT: This file should ONLY be imported in server-side code
 * Never import this in client components!
 * 
 * @security API key is stored in environment variables (server-side only)
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import type { RoadmapContent, RoadmapGenerationInput } from '@/types/roadmap'
import crypto from 'node:crypto'
import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN
const redis = redisUrl && redisToken && !redisUrl.includes('dummy')
  ? new Redis({ url: redisUrl, token: redisToken })
  : null

async function getCachedLLMResponse<T>(key: string): Promise<T | null> {
  if (!redis) return null
  try {
    const cached = await redis.get<string | T>(key)
    if (!cached) return null
    if (typeof cached === 'string') {
      return JSON.parse(cached) as T
    }
    return cached as T
  } catch {
    return null
  }
}

async function setCachedLLMResponse<T>(key: string, data: T, ttlSeconds = 86400): Promise<void> {
  if (!redis) return
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds })
  } catch {
    // Ignore cache write errors
  }
}

function computeCacheKey(prefix: string, payload: unknown): string {
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  return `llm_cache:${prefix}:${hash}`
}

// =====================================================
// Initialize Gemini Client
// =====================================================

/**
 * Initialize the Gemini AI client
 * Uses the GEMINI_API_KEY environment variable
 * 
 * @throws Error if GEMINI_API_KEY is not set
 */
function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY environment variable is not set. ' +
            'Please add it to your .env.local file.'
        )
    }

    return new GoogleGenerativeAI(apiKey)
}

// =====================================================
// Timeout Utility
// =====================================================

/** Maximum time to wait for Gemini API response before failing fast */
const GEMINI_TIMEOUT_MS = 45_000

/**
 * Races a promise against a timeout deadline.
 * Prevents serverless functions from hanging on slow LLM responses.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(
                () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
                ms
            )
        ),
    ])
}

// =====================================================
// Roadmap Generation
// =====================================================

/**
 * Generate a personalized learning roadmap using Gemini AI
 * 
 * @param input - User's preferences and assessment data
 * @returns Structured roadmap content
 * 
 * @example
 * const roadmap = await generateRoadmap({
 *   durationDays: 30,
 *   userGoals: 'Learn machine learning fundamentals',
 *   learningPace: 'moderate',
 *   hoursPerDay: 2,
 *   daysPerWeek: 5,
 *   weakAreas: ['Neural Networks', 'Deep Learning'],
 *   strongAreas: ['Python', 'Statistics'],
 *   assessmentScores: [{ level: 'RCAF', score: 75 }],
 *   preferredLearningStyle: ['video', 'hands-on'],
 *   currentSkillLevel: 'intermediate'
 * })
 */
const PRIMARY_MODEL = 'gemini-3.5-flash'
const FALLBACK_MODEL = 'gemini-3.1-flash-lite'

export async function generateRoadmap(
    input: RoadmapGenerationInput
): Promise<RoadmapContent> {
    const cacheKey = computeCacheKey('roadmap', input)
    const cachedRoadmap = await getCachedLLMResponse<RoadmapContent>(cacheKey)
    if (cachedRoadmap) {
        console.log('[Gemini] Returning cached roadmap response for hash:', cacheKey)
        return cachedRoadmap
    }

    const genAI = getGeminiClient()

    // Use Gemini 3.5 Flash for fast, cost-effective generation
    const model = genAI.getGenerativeModel({
        model: PRIMARY_MODEL,
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
        },
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
    })

    // Calculate week structure
    const totalDays = input.durationDays
    const weeksCount = Math.ceil(totalDays / 7)
    const activeDaysPerWeek = input.daysPerWeek
    const totalActiveDays = Math.min(totalDays, weeksCount * activeDaysPerWeek)
    const totalMinutesPerDay = input.hoursPerDay * 60

    // Build the system prompt
    const systemPrompt = buildSystemPrompt(input, {
        totalDays,
        weeksCount,
        activeDaysPerWeek,
        totalActiveDays,
        totalMinutesPerDay,
    })

    // Build the user prompt
    const userPrompt = `Generate the personalized AI learning roadmap now for this goal: "${input.userGoals}"`

    console.log('[Gemini] Generating roadmap...')
    console.log('[Gemini] Duration:', totalDays, 'days')
    console.log('[Gemini] Weeks:', weeksCount)
    console.log('[Gemini] Active days per week:', activeDaysPerWeek)

    try {
        // Make the API call
        let result
        try {
            result = await withTimeout(
                model.generateContent([systemPrompt, userPrompt]),
                GEMINI_TIMEOUT_MS,
                PRIMARY_MODEL
            )
            console.log('[Gemini] Finish Reason:', result.response.candidates?.[0]?.finishReason)
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage?.includes('429') || errorMessage?.includes('quota')) {
                console.log(`[Gemini] ${PRIMARY_MODEL} quota exceeded, falling back to ${FALLBACK_MODEL}...`)
                const fallbackModel = genAI.getGenerativeModel({ model: FALLBACK_MODEL })
                result = await withTimeout(
                    fallbackModel.generateContent([systemPrompt, userPrompt]),
                    GEMINI_TIMEOUT_MS,
                    `${FALLBACK_MODEL} (fallback)`
                )
            } else {
                throw error
            }
        }

        const response = result.response.text()

        // Debug: Log full response
        console.log('[Gemini] Full response length:', response.length)
        console.log('[Gemini] Response preview:', response.slice(0, 500))

        // Parse and validate the response
        const roadmap = parseGeminiResponse(response)

        await setCachedLLMResponse(cacheKey, roadmap)

        console.log('[Gemini] Roadmap generated successfully and cached')
        console.log('[Gemini] Weeks:', roadmap.weeks.length)
        console.log('[Gemini] Projects:', roadmap.projects.length)
        console.log('[Gemini] Resources:', roadmap.resources.length)

        return roadmap
    } catch (error) {
        console.error('[Gemini] Error generating roadmap:', error)
        throw new Error(
            'Failed to generate roadmap. Please try again. ' +
            (error instanceof Error ? error.message : 'Unknown error')
        )
    }
}

// =====================================================
// Prompt Building
// =====================================================

const CERTIFICATION_CONTEXT = `
## Certification Definitions (Internal Context)
- **RCAF (ReadyCheck AI Foundations)**: Demonstrates foundational knowledge in artificial intelligence concepts and practical application of AI tools in professional environments. Skills: AI Fundamentals, Machine Learning Basics, AI Ethics, Prompt Engineering.
- **RCAP (ReadyCheck AI Practitioner)**: Validates advanced proficiency in implementing AI solutions and integrating AI tools into business workflows. Skills: AI Workflow Integration, Data Analysis with AI, AI-Driven Decision Making.
- **RCGS (ReadyCheck GenAI Specialist)**: Certifies expertise in generative AI technologies and their application in creating innovative AI-powered solutions. Skills: Generative AI Mastery, LLMs, AI Content Generation, Advanced Prompt Engineering.
- **RCSA (ReadyCheck AI Solutions Architect)**: Demonstrates expertise in designing and architecting enterprise-level AI solutions with focus on scalability and business value. Skills: Enterprise AI Architecture, AI Solution Design, AI Strategy & Governance.
`

interface PromptContext {
    totalDays: number
    weeksCount: number
    activeDaysPerWeek: number
    totalActiveDays: number
    totalMinutesPerDay: number
}

/**
 * Build the system prompt for Gemini
 */
function buildSystemPrompt(
    input: RoadmapGenerationInput,
    ctx: PromptContext
): string {
    // Format assessment scores
    const assessmentInfo = input.assessmentScores.length > 0
        ? `Assessment Performance: ${input.assessmentScores.map(s => `${s.level}: ${s.score}%`).join(', ')}`
        : 'No prior assessments (new learner)'

    // Format weak and strong areas
    const weakAreasInfo = input.weakAreas.length > 0
        ? `**FOCUS ON THESE WEAK AREAS**: ${input.weakAreas.join(', ')}`
        : 'No specific weak areas identified'

    const strongAreasInfo = input.strongAreas.length > 0
        ? `Strong areas (use as foundation): ${input.strongAreas.join(', ')}`
        : ''

    // Format specific topics
    const topicsInfo = input.specificTopics?.length
        ? `Specific topics to include: ${input.specificTopics.join(', ')}`
        : ''

    return `You are an expert AI learning path designer specializing in creating personalized roadmaps for AI/ML professionals.

Create a detailed ${ctx.totalDays}-day learning roadmap based on the user's profile:

## User Profile
- **Current skill level**: ${input.currentSkillLevel}
- **Learning pace**: ${input.learningPace}
- **Available time**: ${input.hoursPerDay} hours/day, ${input.daysPerWeek} days/week
- **Preferred learning styles**: ${input.preferredLearningStyle.join(', ')}
- ${assessmentInfo}
- ${weakAreasInfo}
${strongAreasInfo ? `- ${strongAreasInfo}` : ''}
${topicsInfo ? `- ${topicsInfo}` : ''}

## Requirements

1. Create roadmap for EXACTLY ${ctx.totalDays} days, organized into ${ctx.weeksCount} weeks
2. User studies ${ctx.activeDaysPerWeek} days per week - mark other days as rest days
3. Each active day should have 2-3 tasks totaling approximately ${ctx.totalMinutesPerDay} minutes
4. Tasks must be SPECIFIC and ACTIONABLE (not vague like "Learn Python")
5. Progress from easier to harder concepts throughout the roadmap
6. Include 2 hands-on projects that build real, portfolio-worthy skills
7. Suggest 5-8 high-quality resources (mix of free and paid)
8. **PRIORITIZE weak areas** in the first 60% of the roadmap
9. Each task MUST have an "id" field with format "d{day}_t{task}" (e.g., "d1_t1")
10. **CRITICAL: Ensure valid JSON syntax. Do not merge keys or values.**
11. **CRITICAL: Keep descriptions CONCISE (max 15 words) to fit within token limits.**

## Output Format

Return ONLY valid JSON (no markdown code blocks, no extra text). The JSON must match this exact structure:

{
  "weeks": [
    {
      "weekNumber": 1,
      "goal": "Week goal description",
      "days": [
        {
          "dayNumber": 1,
          "focus": "Day's focus topic",
          "isRestDay": false,
          "tasks": [
            {
              "id": "d1_t1",
              "title": "Specific task title",
              "description": "What to do and what to learn",
              "estimatedMinutes": 45,
              "type": "learn"
            }
          ]
        }
      ]
    }
  ],
  "projects": [
    {
      "title": "Project name",
      "description": "What you'll build",
      "weekToStart": 2,
      "difficulty": "intermediate",
      "estimatedHours": 8,
      "learningObjectives": ["objective 1", "objective 2"]
    }
  ],
  "resources": [
    {
      "title": "Resource title",
      "url": "https://example.com",
      "type": "video",
      "relevantWeeks": [1, 2],
      "isFree": true
    }
  ],
  "tips": [
    "Helpful tip 1",
    "Helpful tip 2"
  ]
}

## Task Types
- "learn": Reading, watching videos, studying concepts
- "practice": Coding exercises, quizzes, hands-on practice
- "project": Working on the suggested projects
- "review": Reviewing and reinforcing previous material

## Resource Types
- "article": Blog posts, tutorials
- "video": YouTube, courses
- "documentation": Official docs
- "course": Full courses (Coursera, Udemy, etc.)
- "book": Books and ebooks

Generate the roadmap now.

${CERTIFICATION_CONTEXT}`
}

// =====================================================
// Response Parsing
// =====================================================

/**
 * Parse and validate the Gemini response
 */
function parseGeminiResponse(response: string): RoadmapContent {
    try {
        // 1. Basic cleaning
        let cleaned = response.trim()

        // 2. Remove markdown code blocks
        cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()

        // 3. Find the first { and last }
        const firstBrace = cleaned.indexOf('{')
        const lastBrace = cleaned.lastIndexOf('}')

        if (firstBrace === -1 || lastBrace === -1) {
            throw new Error('No JSON object found in response')
        }

        cleaned = cleaned.slice(firstBrace, lastBrace + 1)

        // 4. JSON Repair: Remove comments safely and fix unescaped characters
        // Use state machine parser to remove comments without breaking URLs
        // AND escape unescaped newlines/tabs in strings
        cleaned = cleanJson(cleaned)

        // 5. JSON Repair: Remove trailing commas before closing braces/brackets
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1')

        console.log('[Gemini] Cleaned response preview:', cleaned.slice(0, 200))

        const parsed = JSON.parse(cleaned)

        // Validate required fields
        if (!parsed.weeks || !Array.isArray(parsed.weeks)) {
            throw new Error('Missing or invalid "weeks" array in response')
        }

        if (!parsed.projects || !Array.isArray(parsed.projects)) {
            parsed.projects = []
        }

        if (!parsed.resources || !Array.isArray(parsed.resources)) {
            parsed.resources = []
        }

        if (!parsed.tips || !Array.isArray(parsed.tips)) {
            parsed.tips = []
        }

        // Validate weeks structure
        for (const week of parsed.weeks) {
            if (typeof week.weekNumber !== 'number') {
                throw new Error('Invalid week structure: missing weekNumber')
            }
            if (!Array.isArray(week.days)) {
                throw new Error('Invalid week structure: missing days array')
            }

            // Validate days
            for (const day of week.days) {
                if (typeof day.dayNumber !== 'number') {
                    throw new Error('Invalid day structure: missing dayNumber')
                }
                if (!Array.isArray(day.tasks)) {
                    day.tasks = []
                }

                // Validate tasks
                for (const task of day.tasks) {
                    if (!task.id || typeof task.id !== 'string') {
                        task.id = `d${day.dayNumber}_t${day.tasks.indexOf(task) + 1}`
                    }
                    if (!task.title) {
                        throw new Error('Invalid task structure: missing title')
                    }
                }
            }
        }

        return parsed as RoadmapContent
    } catch (error) {
        console.error('[Gemini] Failed to parse response:', error)
        console.error('[Gemini] Raw response (first 500 chars):', response.slice(0, 500))
        console.error('[Gemini] Raw response (last 500 chars):', response.slice(-500))

        if (error instanceof SyntaxError) {
            throw new Error(
                'Failed to parse AI response as JSON. The AI returned an invalid format. Please try again.'
            )
        }

        throw error
    }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Safely strip comments AND fix unescaped characters from JSON string
 * Uses a state machine to track string boundaries
 */
function cleanJson(text: string): string {
    let result = ''
    let i = 0
    let inString = false
    let isEscaped = false

    while (i < text.length) {
        const char = text[i]
        const nextChar = text[i + 1]

        // Handle string state
        if (inString) {
            if (isEscaped) {
                isEscaped = false
            } else if (char === '\\') {
                isEscaped = true
            } else if (char === '"') {
                inString = false
            } else if (char === '\n') {
                // Escape unescaped newline
                result += '\\n'
                i++
                continue
            } else if (char === '\r') {
                // Escape unescaped carriage return
                result += '\\r'
                i++
                continue
            } else if (char === '\t') {
                // Escape unescaped tab
                result += '\\t'
                i++
                continue
            }
            result += char
            i++
            continue
        }

        // Check for string start
        if (char === '"') {
            inString = true
            result += char
            i++
            continue
        }

        // Check for single line comment //
        if (char === '/' && nextChar === '/') {
            // Skip until newline
            i += 2
            while (i < text.length && text[i] !== '\n' && text[i] !== '\r') {
                i++
            }
            continue
        }

        // Check for multi line comment /* */
        if (char === '/' && nextChar === '*') {
            // Skip until */
            i += 2
            while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) {
                i++
            }
            i += 2 // Skip the closing */
            continue
        }

        result += char
        i++
    }

    return repairTruncatedJson(result)
}

/**
 * Repairs truncated JSON by closing open arrays, objects, and strings.
 */
function repairTruncatedJson(jsonString: string): string {
    let repaired = jsonString.trim();

    // 1. Handle incomplete strings at the very end
    let inString = false;
    let isEscaped = false;
    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];
        if (char === '"' && !isEscaped) {
            inString = !inString;
        }
        isEscaped = (char === '\\' && !isEscaped);
    }

    if (inString) {
        repaired += '"';
    }

    // 2. Balance braces and brackets
    const stack: string[] = [];
    inString = false;
    isEscaped = false;

    for (let i = 0; i < repaired.length; i++) {
        const char = repaired[i];

        if (char === '"' && !isEscaped) {
            inString = !inString;
        }
        isEscaped = (char === '\\' && !isEscaped);

        if (!inString) {
            if (char === '{') stack.push('}');
            else if (char === '[') stack.push(']');
            else if (char === '}' || char === ']') {
                const expected = stack.length > 0 ? stack[stack.length - 1] : null;
                if (char === expected) {
                    stack.pop();
                }
            }
        }
    }

    // Close remaining open structures
    while (stack.length > 0) {
        repaired += stack.pop();
    }

    return repaired;
}

/**
 * Count total tasks in a roadmap
 */
export function countTotalTasks(content: RoadmapContent): number {
    return content.weeks.reduce((total, week) =>
        total + week.days.reduce((dayTotal, day) =>
            dayTotal + (day.tasks?.length || 0), 0
        ), 0
    )
}

/**
 * Get all task IDs from a roadmap
 */
export function getAllTaskIds(content: RoadmapContent): string[] {
    const ids: string[] = []

    for (const week of content.weeks) {
        for (const day of week.days) {
            for (const task of day.tasks || []) {
                if (task.id) {
                    ids.push(task.id)
                }
            }
        }
    }

    return ids
}
