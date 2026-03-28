/**
 * ReadyCheck AI - Question Schema Validator v2.0
 * Comprehensive validation for the enhanced question schema
 */

const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const fs = require('fs')
const path = require('path')

class QuestionValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, strict: false })
    addFormats(this.ajv)
    
    // Load the enhanced schema
    const schemaPath = path.join(__dirname, 'enhanced-question-schema-v2.json')
    this.schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'))
    this.validate = this.ajv.compile(this.schema)
    
    // Custom validation rules
    this.setupCustomValidations()
  }
  
  setupCustomValidations() {
    // Custom validator for question_key format
    this.ajv.addFormat('question_key', {
      type: 'string',
      validate: (value) => {
        const pattern = /^[A-Z]{2,4}_[A-Z0-9]+_\d{3,6}$/
        return pattern.test(value)
      }
    })
    
    // Custom validator for option consistency
    this.ajv.addKeyword({
      keyword: 'optionConsistency',
      type: 'object',
      schemaType: 'boolean',
      validate: function validateOptionConsistency(schema, data) {
        if (!schema) return true
        
        const { question_format, content } = data
        
        // Validate single choice has exactly one correct answer
        if (question_format === 'single_choice') {
          if (!content.correct_answer || !content.correct_answer.option_id) {
            validateOptionConsistency.errors = [{ message: 'Single choice must have exactly one correct answer' }]
            return false
          }
          
          const validOptionIds = content.options?.map(opt => opt.id) || []
          if (!validOptionIds.includes(content.correct_answer.option_id)) {
            validateOptionConsistency.errors = [{ message: 'Correct answer ID must match an existing option ID' }]
            return false
          }
        }
        
        // Validate multiple choice has multiple correct answers
        if (question_format === 'multiple_choice') {
          if (!content.correct_answers || content.correct_answers.length < 2) {
            validateOptionConsistency.errors = [{ message: 'Multiple choice must have at least 2 correct answers' }]
            return false
          }
        }
        
        return true
      }
    })
  }
  
  /**
   * Validate a single question
   * @param {Object} question - Question object to validate
   * @returns {Object} Validation result with errors if any
   */
  validateQuestion(question) {
    const isValid = this.validate(question)
    
    const result = {
      isValid,
      errors: this.validate.errors || [],
      warnings: [],
      suggestions: []
    }
    
    // Add contextual validations
    this.addContextualValidations(question, result)
    
    return result
  }
  
  /**
   * Add business logic validations
   */
  addContextualValidations(question, result) {
    const warnings = []
    const suggestions = []
    
    // Check time allocation reasonableness
    const timeSeconds = question.assessment_config?.time_allocation?.seconds
    if (timeSeconds) {
      if (timeSeconds < 30) {
        warnings.push('Time allocation under 30 seconds may be too short for most users')
      }
      if (timeSeconds > 600 && question.question_format !== 'case_study') {
        warnings.push('Time allocation over 10 minutes should typically be reserved for case studies')
      }
    }
    
    // Check difficulty consistency
    const difficultyLevel = question.difficulty?.level
    const difficultyScore = question.difficulty?.score
    if (difficultyLevel && difficultyScore) {
      const levelToScoreMap = {
        'beginner': [1, 3],
        'intermediate': [4, 6], 
        'advanced': [7, 8],
        'expert': [9, 10]
      }
      
      const [min, max] = levelToScoreMap[difficultyLevel] || [1, 10]
      if (difficultyScore < min || difficultyScore > max) {
        warnings.push(`Difficulty score ${difficultyScore} doesn't align with level '${difficultyLevel}' (expected ${min}-${max})`)
      }
    }
    
    // Check question text length vs format
    const questionLength = question.question_text?.length || 0
    if (question.question_format === 'true_false' && questionLength > 200) {
      suggestions.push('True/false questions work best with concise statements (under 200 characters)')
    }
    
    if (question.question_format === 'case_study' && questionLength < 100) {
      warnings.push('Case study questions typically need more context (at least 100 characters)')
    }
    
    // Check for missing explanations
    if (!question.explanation?.correct_answer_explanation) {
      suggestions.push('Adding explanations improves learning outcomes and user satisfaction')
    }
    
    // Check business context for certification questions
    if (question.assessment_config?.certification_levels?.length && !question.business_context?.real_world_application) {
      suggestions.push('Certification questions should include business context to demonstrate real-world relevance')
    }
    
    // Check accessibility
    if (!question.accessibility?.screen_reader_text && question.media?.images?.length) {
      warnings.push('Questions with images should include screen reader text for accessibility')
    }
    
    result.warnings = warnings
    result.suggestions = suggestions
  }
  
  /**
   * Validate multiple questions and provide batch report
   */
  validateBatch(questions) {
    const results = questions.map(q => this.validateQuestion(q))
    
    const summary = {
      total: questions.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
      withWarnings: results.filter(r => r.warnings.length > 0).length,
      commonIssues: this.getCommonIssues(results)
    }
    
    return {
      summary,
      results,
      recommendations: this.getBatchRecommendations(results)
    }
  }
  
  getCommonIssues(results) {
    const issueCount = {}
    
    results.forEach(result => {
      [...result.errors, ...result.warnings].forEach(issue => {
        const key = issue.message || issue.instancePath
        issueCount[key] = (issueCount[key] || 0) + 1
      })
    })
    
    return Object.entries(issueCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([issue, count]) => ({ issue, count }))
  }
  
  getBatchRecommendations(results) {
    const recommendations = []
    
    const invalidCount = results.filter(r => !r.isValid).length
    if (invalidCount > 0) {
      recommendations.push(`Fix ${invalidCount} validation errors before importing questions`)
    }
    
    const missingExplanations = results.filter(r => 
      r.suggestions.some(s => s.includes('explanation'))
    ).length
    if (missingExplanations > results.length * 0.3) {
      recommendations.push('Consider adding explanations to improve learning outcomes')
    }
    
    const accessibilityIssues = results.filter(r =>
      r.warnings.some(w => w.includes('accessibility'))
    ).length
    if (accessibilityIssues > 0) {
      recommendations.push('Review accessibility requirements for inclusive design')
    }
    
    return recommendations
  }
  
  /**
   * Generate validation report
   */
  generateReport(questions, outputPath) {
    const batchResult = this.validateBatch(questions)
    
    const report = {
      timestamp: new Date().toISOString(),
      schema_version: '2.0.0',
      summary: batchResult.summary,
      recommendations: batchResult.recommendations,
      detailed_results: batchResult.results.map((result, index) => ({
        question_key: questions[index]?.question_key || `Question_${index + 1}`,
        isValid: result.isValid,
        errorCount: result.errors.length,
        warningCount: result.warnings.length,
        issues: [...result.errors, ...result.warnings, ...result.suggestions]
      }))
    }
    
    if (outputPath) {
      fs.writeFileSync(outputPath, JSON.stringify(report, null, 2))
      console.log(`Validation report saved to: ${outputPath}`)
    }
    
    return report
  }
}

module.exports = QuestionValidator

// CLI Usage
if (require.main === module) {
  const [,, questionsFile, outputFile] = process.argv
  
  if (!questionsFile) {
    console.log('Usage: node question-validator.js <questions.json> [output-report.json]')
    process.exit(1)
  }
  
  try {
    const questions = JSON.parse(fs.readFileSync(questionsFile, 'utf8'))
    const validator = new QuestionValidator()
    const report = validator.generateReport(questions, outputFile)
    
    console.log('\n=== VALIDATION SUMMARY ===')
    console.log(`Total Questions: ${report.summary.total}`)
    console.log(`Valid: ${report.summary.valid}`)
    console.log(`Invalid: ${report.summary.invalid}`)
    console.log(`With Warnings: ${report.summary.withWarnings}`)
    
    if (report.summary.commonIssues.length > 0) {
      console.log('\n=== COMMON ISSUES ===')
      report.summary.commonIssues.forEach(({ issue, count }) => {
        console.log(`${count}x: ${issue}`)
      })
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n=== RECOMMENDATIONS ===')
      report.recommendations.forEach(rec => {
        console.log(`• ${rec}`)
      })
    }
    
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}
