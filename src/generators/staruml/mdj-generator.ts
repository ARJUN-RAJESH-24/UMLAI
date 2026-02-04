import { UMLDiagramIR, StructuralDiagramIR, SequenceDiagramIR, ERDiagramIR } from '../../types/uml-ir';

interface MDJElement {
    _type: string;
    _id: string;
    _parent?: { $ref: string };
    name?: string;
    [key: string]: any;
}

interface MDJModel {
    _type: string;
    _id: string;
    name: string;
    ownedElements: MDJElement[];
}

let elementIdCounter = 0;

function generateId(): string {
    return `AAAA${String(++elementIdCounter).padStart(20, '0')}`;
}

function resetIdCounter(): void {
    elementIdCounter = 0;
}

export function generateStarUMLMDJ(ir: UMLDiagramIR): string {
    resetIdCounter();

    const projectId = generateId();
    const modelId = generateId();

    const project: MDJModel = {
        _type: 'Project',
        _id: projectId,
        name: ir.title || 'UML Project',
        ownedElements: []
    };

    const model: MDJElement = {
        _type: 'UMLModel',
        _id: modelId,
        _parent: { $ref: projectId },
        name: 'Model',
        ownedElements: []
    };

    project.ownedElements.push(model);

    // Generate diagram-specific content
    switch (ir.diagramType) {
        case 'class':
        case 'object':
            generateClassMDJ(ir as StructuralDiagramIR, model, modelId);
            break;
        case 'sequence':
        case 'communication':
            generateSequenceMDJ(ir as SequenceDiagramIR, model, modelId);
            break;
        case 'er':
            generateERMDJ(ir as ERDiagramIR, model, modelId);
            break;
        default:
            // For other diagram types, create basic structure
            generateGenericMDJ(ir, model, modelId);
    }

    return JSON.stringify(project, null, 2);
}

function generateClassMDJ(ir: StructuralDiagramIR, model: MDJElement, parentId: string): void {
    const elementMap = new Map<string, string>();

    // Create classes/interfaces
    for (const element of ir.elements) {
        const elementId = generateId();
        elementMap.set(element.name, elementId);

        const umlType = element.type === 'interface' ? 'UMLInterface' : 'UMLClass';

        const classElement: MDJElement = {
            _type: umlType,
            _id: elementId,
            _parent: { $ref: parentId },
            name: element.name,
            isAbstract: element.type === 'abstract',
            attributes: [],
            operations: []
        };

        // Add attributes
        for (const attr of element.attributes) {
            const attrId = generateId();
            classElement.attributes.push({
                _type: 'UMLAttribute',
                _id: attrId,
                _parent: { $ref: elementId },
                name: attr.name,
                type: attr.type,
                visibility: mapVisibility(attr.visibility),
                isStatic: attr.isStatic || false
            });
        }

        // Add methods
        for (const method of element.methods) {
            const methodId = generateId();
            const operation: MDJElement = {
                _type: 'UMLOperation',
                _id: methodId,
                _parent: { $ref: elementId },
                name: method.name,
                visibility: mapVisibility(method.visibility),
                isStatic: method.isStatic || false,
                isAbstract: method.isAbstract || false,
                parameters: []
            };

            // Add parameters
            for (const param of method.parameters) {
                const paramId = generateId();
                operation.parameters.push({
                    _type: 'UMLParameter',
                    _id: paramId,
                    _parent: { $ref: methodId },
                    name: param.name,
                    type: param.type,
                    direction: 'in'
                });
            }

            // Add return type as parameter
            if (method.returnType && method.returnType !== 'void') {
                const returnId = generateId();
                operation.parameters.push({
                    _type: 'UMLParameter',
                    _id: returnId,
                    _parent: { $ref: methodId },
                    name: '',
                    type: method.returnType,
                    direction: 'return'
                });
            }

            classElement.operations.push(operation);
        }

        model.ownedElements!.push(classElement);
    }

    // Create relationships
    for (const rel of ir.relationships) {
        const relId = generateId();
        const fromId = elementMap.get(rel.from);
        const toId = elementMap.get(rel.to);

        if (!fromId || !toId) continue;

        let relType = 'UMLAssociation';
        switch (rel.type) {
            case 'inheritance':
                relType = 'UMLGeneralization';
                break;
            case 'realization':
                relType = 'UMLInterfaceRealization';
                break;
            case 'dependency':
                relType = 'UMLDependency';
                break;
            default:
                relType = 'UMLAssociation';
        }

        const relationship: MDJElement = {
            _type: relType,
            _id: relId,
            _parent: { $ref: parentId },
            name: rel.label || '',
            source: { $ref: fromId },
            target: { $ref: toId }
        };

        // Add aggregation kind for composition/aggregation
        if (rel.type === 'composition') {
            relationship.end1 = { aggregation: 'composite' };
        } else if (rel.type === 'aggregation') {
            relationship.end1 = { aggregation: 'shared' };
        }

        model.ownedElements!.push(relationship);
    }
}

function generateSequenceMDJ(ir: SequenceDiagramIR, model: MDJElement, parentId: string): void {
    const participantMap = new Map<string, string>();

    // Create lifelines (participants)
    for (const participant of ir.participants) {
        const lifelineId = generateId();
        const key = participant.alias || participant.name;
        participantMap.set(key, lifelineId);

        model.ownedElements!.push({
            _type: 'UMLLifeline',
            _id: lifelineId,
            _parent: { $ref: parentId },
            name: participant.name,
            represent: participant.type === 'actor' ? 'UMLActor' : 'UMLClass'
        });
    }

    // Create messages
    for (const message of ir.messages) {
        const messageId = generateId();
        const fromId = participantMap.get(message.from);
        const toId = participantMap.get(message.to);

        if (!fromId || !toId) continue;

        model.ownedElements!.push({
            _type: 'UMLMessage',
            _id: messageId,
            _parent: { $ref: parentId },
            name: message.label,
            source: { $ref: fromId },
            target: { $ref: toId },
            messageSort: mapMessageType(message.type)
        });
    }
}

function generateERMDJ(ir: ERDiagramIR, model: MDJElement, parentId: string): void {
    // ER diagrams are represented as specialized class diagrams in StarUML
    const entityMap = new Map<string, string>();

    for (const entity of ir.entities) {
        const entityId = generateId();
        entityMap.set(entity.name, entityId);

        const classElement: MDJElement = {
            _type: 'UMLClass',
            _id: entityId,
            _parent: { $ref: parentId },
            name: entity.name,
            stereotype: 'Entity',
            attributes: []
        };

        for (const attr of entity.attributes) {
            const attrId = generateId();
            let stereotype = '';
            if (attr.isPrimaryKey) stereotype = 'PK';
            else if (attr.isForeignKey) stereotype = 'FK';

            classElement.attributes.push({
                _type: 'UMLAttribute',
                _id: attrId,
                _parent: { $ref: entityId },
                name: attr.name,
                type: attr.type,
                visibility: 'public',
                stereotype: stereotype
            });
        }

        model.ownedElements!.push(classElement);
    }

    // Create relationships
    for (const rel of ir.relationships) {
        const relId = generateId();
        const fromId = entityMap.get(rel.from);
        const toId = entityMap.get(rel.to);

        if (!fromId || !toId) continue;

        model.ownedElements!.push({
            _type: 'UMLAssociation',
            _id: relId,
            _parent: { $ref: parentId },
            name: rel.label || '',
            source: { $ref: fromId },
            target: { $ref: toId },
            end1: { multiplicity: rel.fromCardinality },
            end2: { multiplicity: rel.toCardinality }
        });
    }
}

function generateGenericMDJ(ir: UMLDiagramIR, model: MDJElement, parentId: string): void {
    // Create a note with diagram information
    const noteId = generateId();
    model.ownedElements!.push({
        _type: 'UMLClass',
        _id: noteId,
        _parent: { $ref: parentId },
        name: ir.title || 'Diagram',
        documentation: `Diagram Type: ${ir.diagramType}\n\nThis diagram type requires manual completion in StarUML.`
    });
}

function mapVisibility(visibility: string): string {
    const map: Record<string, string> = {
        '+': 'public',
        '-': 'private',
        '#': 'protected',
        '~': 'package'
    };
    return map[visibility] || 'public';
}

function mapMessageType(type: string): string {
    const map: Record<string, string> = {
        'sync': 'synchCall',
        'async': 'asynchCall',
        'return': 'reply',
        'create': 'createMessage',
        'destroy': 'deleteMessage'
    };
    return map[type] || 'synchCall';
}

export default { generateStarUMLMDJ };
