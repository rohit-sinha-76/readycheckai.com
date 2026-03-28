# ReadyCheck AI - Enhanced Question Schema v2.0

## Overview

This enhanced schema provides a **unified, scalable format** for all question types in ReadyCheck AI. It solves the current issues with schema misalignment and provides a future-proof foundation for scaling your platform.

## Key Benefits

✅ **Single Format** - One schema for all question types  
✅ **Easy Management** - Consistent structure across all questions  
✅ **Scalability** - Add new question types without breaking existing content  
✅ **Validation** - Built-in validation prevents errors  
✅ **Internationalization** - Support for multiple languages  
✅ **Accessibility** - Screen reader and accessibility support built-in  
✅ **Business Context** - Links questions to real-world applications  

## Quick Start

### 1. Basic Single Choice Question

```json
{
  "_schema_version": "2.0.0",
  "question_key": "RCAI_FUND_001",
  "question_text": "What is machine learning?",
  "question_format": "single_choice",
  "category": {
    "primary": "fundamentals",
    "code": "ai_basics",
    "subcategories": ["machine_learning"]
  },
  "difficulty": {
    "level": "beginner", 
    "score": 2
  },
  "assessment_config": {
    "question_types": ["practice"],
    "time_allocation": {"seconds": 90},
    "points": {"base_points": 2}
  },
  "content": {
    "options": [
      {"id": "A", "text": "A subset of AI that learns from data"},
      {"id": "B", "text": "The same as artificial intelligence"},
      {"id": "C", "text": "A programming language"},
      {"id": "D", "text": "A database technology"}
    ],
    "correct_answer": {
      "option_id": "A",
      "explanation": "Machine learning is a subset of AI focused on learning patterns from data."
    }
  },
  "explanation": {
    "correct_answer_explanation": "ML enables systems to automatically learn and improve from experience without being explicitly programmed."
  },
  "status": {"active": true, "published": true}
}
```

### 2. Validate Your Questions

```bash
# Install dependencies
npm install ajv ajv-formats

# Validate a single question file
node schemas/question-validator.js your-questions.json validation-report.json

# Check validation results
cat validation-report.json
```

## Question Types Supported

| Format | Use Case | Example |
|--------|----------|---------|
| `single_choice` | Multiple choice with one answer | A, B, C, D options |
| `multiple_choice` | Multiple correct answers | Select all that apply |
| `true_false` | Boolean questions | True/False statements |
| `essay` | Long-form answers | Business scenarios |
| `code_completion` | Programming questions | Fill in code |
| `case_study` | Complex scenarios | Multi-part analysis |
| `simulation` | Interactive demos | Virtual environments |

## Difficulty Levels

| Level | Score Range | Description |
|-------|-------------|-------------|
| `beginner` | 1-3 | Basic concepts, definitions |
| `intermediate` | 4-6 | Applied knowledge, analysis |
| `advanced` | 7-8 | Complex scenarios, synthesis |
| `expert` | 9-10 | Strategic thinking, innovation |

## Question Key Format

**Pattern:** `PREFIX_CATEGORY_NUMBER`

**Examples:**
- `RCAI_FUND_001` - AI Fundamentals question #1
- `RCML_TECH_157` - ML Technical question #157  
- `RCBIZ_ETH_042` - Business Ethics question #42

**Prefixes:**
- `RCAI` - ReadyCheck AI general
- `RCML` - Machine Learning specific
- `RCBIZ` - Business applications
- `RCETH` - Ethics and governance

## Categories

### Primary Categories
- `fundamentals` - Basic concepts and definitions
- `technical` - Implementation and engineering
- `business` - Applications and strategy  
- `ethics` - Governance and responsible AI
- `general` - Cross-cutting topics
- `specialized` - Advanced domain-specific

### Category Codes
Use lowercase with underscores: `ai_basics`, `ml_engineering`, `data_ethics`

## Time Allocation Guidelines

| Question Type | Recommended Time |
|---------------|------------------|
| Single/Multiple Choice | 60-120 seconds |
| True/False | 30-60 seconds |
| Essay | 300-900 seconds |
| Code | 300-600 seconds |
| Case Study | 600-1800 seconds |

## Points System

- **Base Points:** 1-20 based on difficulty and complexity
- **Bonus Points:** Time bonus, streak bonus, first attempt bonus
- **Typical Range:** 
  - Beginner: 1-3 points
  - Intermediate: 2-5 points  
  - Advanced: 4-8 points
  - Expert: 6-20 points

## Business Context Guidelines

Always include for certification questions:

```json
"business_context": {
  "real_world_application": "How this knowledge applies in practice",
  "industry_relevance": ["technology", "finance", "healthcare"],
  "role_relevance": ["data_scientist", "product_manager"],
  "impact_level": "high"
}
```

## Accessibility Requirements

Include for all questions with media:

```json
"accessibility": {
  "screen_reader_text": "Description for screen readers",
  "keyboard_navigation": true,
  "high_contrast_compatible": true
}
```

## Validation Rules

### Required Fields
- `question_key` - Unique identifier
- `question_text` - The actual question
- `question_format` - Type of interaction
- `category` - Classification
- `difficulty` - Level and score
- `content` - Format-specific content

### Automatic Validations
- Question key format validation
- Option consistency checks  
- Time allocation reasonableness
- Difficulty level alignment
- Business context for certification questions
- Accessibility requirements for media questions

### Best Practices
- Keep single choice questions under 200 characters
- Provide explanations for all answers
- Include business context for certification questions
- Add accessibility text for images
- Use consistent option IDs (A, B, C, D)

## Migration from Current Schema

Your existing questions can be migrated using the migration script:

```bash
# Migrate existing questions to new schema
node scripts/migrate-to-v2-schema.js questions/qus.universal.json questions/qus.v2.json

# Validate migrated questions
node schemas/question-validator.js questions/qus.v2.json migration-report.json
```

## Advanced Features

### Conditional Logic
```json
"content": {
  "adaptive_difficulty": true,
  "follow_up_questions": ["RCAI_FUND_002", "RCAI_FUND_003"]
}
```

### Multilingual Support
```json
"localization": {
  "primary_language": "en",
  "translations": {
    "es": {
      "question_text": "¿Qué es el aprendizaje automático?",
      "options": [...]
    }
  }
}
```

### Analytics Integration
```json
"analytics": {
  "learning_objectives": ["Understand ML concepts"],
  "bloom_taxonomy_level": "understand",
  "prerequisite_knowledge": ["Basic AI concepts"]
}
```

## Common Mistakes to Avoid

❌ **Don't:** Use inconsistent option IDs  
✅ **Do:** Use A, B, C, D pattern consistently

❌ **Don't:** Skip explanations  
✅ **Do:** Explain both correct and incorrect answers

❌ **Don't:** Make questions too long for the format  
✅ **Do:** Match question length to interaction type

❌ **Don't:** Forget accessibility  
✅ **Do:** Include screen reader text for images

❌ **Don't:** Use vague business context  
✅ **Do:** Provide specific real-world applications

## Support & Resources

- **Schema File:** `schemas/enhanced-question-schema-v2.json`
- **Validator:** `schemas/question-validator.js`
- **Examples:** `schemas/question-examples.json`
- **Migration Tool:** `scripts/migrate-to-v2-schema.js`

For technical support or schema questions, refer to the validation tool output or contact the development team.
