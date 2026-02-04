import Ajv, { ValidateFunction, ErrorObject } from 'ajv';
import structuralSchema from '../schemas/structural.schema.json';
import interactionSchema from '../schemas/interaction.schema.json';
import behavioralSchema from '../schemas/behavioral.schema.json';
import architectureSchema from '../schemas/architecture.schema.json';
import dataSchema from '../schemas/data.schema.json';
import { DiagramType, UMLDiagramIR } from '../types/uml-ir';

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

export interface ValidationError {
    path: string;
    message: string;
    keyword: string;
}

class SchemaValidator {
    private ajv: Ajv;
    private validators: Map<string, ValidateFunction>;

    constructor() {
        this.ajv = new Ajv({ allErrors: true, strict: false });
        this.validators = new Map();
        this.initializeValidators();
    }

    private initializeValidators(): void {
        // Register schemas
        this.ajv.addSchema(structuralSchema, 'structural');
        this.ajv.addSchema(interactionSchema, 'interaction');
        this.ajv.addSchema(behavioralSchema, 'behavioral');
        this.ajv.addSchema(architectureSchema, 'architecture');
        this.ajv.addSchema(dataSchema, 'data');

        // Compile validators
        this.validators.set('class', this.ajv.compile(structuralSchema));
        this.validators.set('object', this.ajv.compile(structuralSchema));
        this.validators.set('sequence', this.ajv.compile(interactionSchema));
        this.validators.set('communication', this.ajv.compile(interactionSchema));
        this.validators.set('state', this.ajv.compile(behavioralSchema));
        this.validators.set('activity', this.ajv.compile(behavioralSchema));
        this.validators.set('component', this.ajv.compile(architectureSchema));
        this.validators.set('deployment', this.ajv.compile(architectureSchema));
        this.validators.set('package', this.ajv.compile(architectureSchema));
        this.validators.set('er', this.ajv.compile(dataSchema));
    }

    public validate(ir: UMLDiagramIR): ValidationResult {
        const diagramType = ir.diagramType;
        const validator = this.validators.get(diagramType);

        if (!validator) {
            return {
                valid: false,
                errors: [{
                    path: '/diagramType',
                    message: `Unknown diagram type: ${diagramType}`,
                    keyword: 'enum'
                }]
            };
        }

        const valid = validator(ir);

        if (valid) {
            return { valid: true, errors: [] };
        }

        const errors = this.formatErrors(validator.errors || []);
        return { valid: false, errors };
    }

    private formatErrors(ajvErrors: ErrorObject[]): ValidationError[] {
        return ajvErrors.map(err => ({
            path: err.instancePath || '/',
            message: err.message || 'Unknown validation error',
            keyword: err.keyword
        }));
    }

    public getSchema(diagramType: DiagramType): object | undefined {
        const schemaMap: Record<string, object> = {
            'class': structuralSchema,
            'object': structuralSchema,
            'sequence': interactionSchema,
            'communication': interactionSchema,
            'state': behavioralSchema,
            'activity': behavioralSchema,
            'component': architectureSchema,
            'deployment': architectureSchema,
            'package': architectureSchema,
            'er': dataSchema
        };
        return schemaMap[diagramType];
    }
}

export const schemaValidator = new SchemaValidator();
export default schemaValidator;
