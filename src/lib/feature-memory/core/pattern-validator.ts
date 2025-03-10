import { ValidationResult } from './types';

interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
  code: string;
  severity: 'critical' | 'warning';
}

interface ValidationContext {
  timestamp: Date;
  startTime: number;
  validatedItems: number;
}

export class PatternValidator {
  private rules: Map<string, ValidationRule<any>[]> = new Map();
  private context: ValidationContext = {
    timestamp: new Date(),
    startTime: performance.now(),
    validatedItems: 0,
  };

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Validate a pattern against all registered rules
   * @param pattern Pattern to validate
   * @param ruleSet Optional specific rule set to use
   * @returns Validation result
   */
  validate<T>(pattern: T, ruleSet?: string): ValidationResult {
    this.context = {
      timestamp: new Date(),
      startTime: performance.now(),
      validatedItems: 0,
    };

    const errors: { code: string; message: string; severity: 'critical' | 'warning' }[] = [];
    const warnings: { code: string; message: string }[] = [];

    try {
      const rulesToApply = ruleSet ? 
        this.rules.get(ruleSet) || [] : 
        Array.from(this.rules.values()).flat();

      for (const rule of rulesToApply) {
        this.context.validatedItems++;
        if (!rule.validate(pattern)) {
          if (rule.severity === 'critical') {
            errors.push({
              code: rule.code,
              message: rule.message,
              severity: rule.severity,
            });
          } else {
            warnings.push({
              code: rule.code,
              message: rule.message,
            });
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        metadata: {
          timestamp: this.context.timestamp,
          validationDuration: performance.now() - this.context.startTime,
          validatedItemsCount: this.context.validatedItems,
        },
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown validation error',
          severity: 'critical',
        }],
        warnings: [],
        metadata: {
          timestamp: this.context.timestamp,
          validationDuration: performance.now() - this.context.startTime,
          validatedItemsCount: this.context.validatedItems,
        },
      };
    }
  }

  /**
   * Add a new validation rule
   * @param ruleSet Rule set identifier
   * @param rule Validation rule to add
   */
  addRule<T>(ruleSet: string, rule: ValidationRule<T>): void {
    const existingRules = this.rules.get(ruleSet) || [];
    this.rules.set(ruleSet, [...existingRules, rule]);
  }

  /**
   * Remove a validation rule
   * @param ruleSet Rule set identifier
   * @param ruleCode Code of the rule to remove
   */
  removeRule(ruleSet: string, ruleCode: string): void {
    const existingRules = this.rules.get(ruleSet);
    if (existingRules) {
      this.rules.set(
        ruleSet,
        existingRules.filter(rule => rule.code !== ruleCode)
      );
    }
  }

  /**
   * Clear all validation rules for a rule set
   * @param ruleSet Rule set identifier
   */
  clearRules(ruleSet: string): void {
    this.rules.delete(ruleSet);
  }

  private initializeDefaultRules(): void {
    // Pattern structure validation rules
    this.addRule('pattern', {
      validate: (pattern: any) => pattern && typeof pattern === 'object',
      message: 'Pattern must be a valid object',
      code: 'INVALID_PATTERN_STRUCTURE',
      severity: 'critical',
    });

    // Feature validation rules
    this.addRule('features', {
      validate: (features: Map<string, any>) => features instanceof Map && features.size > 0,
      message: 'Features must be a non-empty Map',
      code: 'INVALID_FEATURES',
      severity: 'critical',
    });

    // Confidence score validation rules
    this.addRule('confidence', {
      validate: (confidence: number) => 
        typeof confidence === 'number' && confidence >= 0 && confidence <= 1,
      message: 'Confidence must be a number between 0 and 1',
      code: 'INVALID_CONFIDENCE',
      severity: 'critical',
    });

    // Performance validation rules
    this.addRule('performance', {
      validate: (pattern: any) => {
        const startTime = performance.now();
        const result = pattern && typeof pattern === 'object';
        const endTime = performance.now();
        return endTime - startTime < 50; // 50ms performance target
      },
      message: 'Pattern validation exceeded performance target',
      code: 'PERFORMANCE_WARNING',
      severity: 'warning',
    });

    // Resource constraints validation rules
    this.addRule('resources', {
      validate: (pattern: any) => {
        const size = new TextEncoder().encode(JSON.stringify(pattern)).length;
        return size <= 1024 * 1024; // 1MB size limit
      },
      message: 'Pattern exceeds maximum size limit',
      code: 'RESOURCE_LIMIT_EXCEEDED',
      severity: 'critical',
    });
  }
}