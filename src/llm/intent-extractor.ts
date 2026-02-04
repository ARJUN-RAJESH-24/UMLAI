import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { DiagramType, UMLDiagramIR } from '../types/uml-ir';
import { buildPrompt } from './prompt-templates';
import { schemaValidator } from '../validation/schema-validator';
import { ruleEngine } from '../validation/rule-engine';

export interface ExtractionResult {
    success: boolean;
    ir?: UMLDiagramIR;
    errors?: string[];
    warnings?: string[];
    needsClarification?: boolean;
    clarificationQuestions?: string[];
    rawResponse?: string;
}

export interface IntentExtractorConfig {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxRetries?: number;
}

class IntentExtractor {
    private genAI: GoogleGenerativeAI | null = null;
    private model: GenerativeModel | null = null;
    private config: IntentExtractorConfig | null = null;

    public configure(config: IntentExtractorConfig): void {
        this.config = {
            model: 'gemini-1.5-flash',
            temperature: 0.1, // Low temperature for deterministic output
            maxRetries: 2,
            ...config
        };

        this.genAI = new GoogleGenerativeAI(config.apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: this.config.model!,
            generationConfig: {
                temperature: this.config.temperature,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
    }

    public isConfigured(): boolean {
        return this.model !== null && this.config !== null;
    }

    public async extract(
        diagramType: DiagramType,
        naturalLanguageInput: string
    ): Promise<ExtractionResult> {
        if (!this.model) {
            return {
                success: false,
                errors: ['Intent extractor not configured. Please provide API key.']
            };
        }

        const prompt = buildPrompt(diagramType, naturalLanguageInput);
        let lastError: string = '';

        for (let attempt = 0; attempt < (this.config?.maxRetries || 2); attempt++) {
            try {
                const result = await this.model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                // Parse JSON from response
                const ir = this.parseResponse(text);

                if (!ir) {
                    lastError = 'Failed to parse JSON from LLM response';
                    continue;
                }

                // Validate against schema
                const schemaResult = schemaValidator.validate(ir);
                if (!schemaResult.valid) {
                    return {
                        success: false,
                        errors: schemaResult.errors.map(e => `${e.path}: ${e.message}`),
                        rawResponse: text
                    };
                }

                // Validate against semantic rules
                const ruleResult = ruleEngine.validate(ir);

                return {
                    success: ruleResult.valid,
                    ir: ir,
                    errors: ruleResult.violations
                        .filter(v => v.severity === 'error')
                        .map(v => `[${v.rule}] ${v.message}`),
                    warnings: ruleResult.violations
                        .filter(v => v.severity === 'warning')
                        .map(v => `[${v.rule}] ${v.message}`),
                    rawResponse: text
                };

            } catch (error) {
                lastError = error instanceof Error ? error.message : 'Unknown error';
            }
        }

        return {
            success: false,
            errors: [`Failed after ${this.config?.maxRetries} attempts: ${lastError}`]
        };
    }

    private parseResponse(text: string): UMLDiagramIR | null {
        // Try to extract JSON from the response
        let jsonStr = text.trim();

        // Remove markdown code blocks if present
        const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1].trim();
        }

        // Try to find JSON object
        const objectMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objectMatch) {
            jsonStr = objectMatch[0];
        }

        try {
            return JSON.parse(jsonStr) as UMLDiagramIR;
        } catch {
            return null;
        }
    }

    // For testing without LLM
    public async extractFromIR(ir: UMLDiagramIR): Promise<ExtractionResult> {
        const schemaResult = schemaValidator.validate(ir);
        if (!schemaResult.valid) {
            return {
                success: false,
                errors: schemaResult.errors.map(e => `${e.path}: ${e.message}`)
            };
        }

        const ruleResult = ruleEngine.validate(ir);

        return {
            success: ruleResult.valid,
            ir: ir,
            errors: ruleResult.violations
                .filter(v => v.severity === 'error')
                .map(v => `[${v.rule}] ${v.message}`),
            warnings: ruleResult.violations
                .filter(v => v.severity === 'warning')
                .map(v => `[${v.rule}] ${v.message}`)
        };
    }
}

export const intentExtractor = new IntentExtractor();
export default intentExtractor;
