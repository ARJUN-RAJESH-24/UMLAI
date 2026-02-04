import {
    StructuralDiagramIR,
    ClassElement,
    Relationship,
    Visibility
} from '../../types/uml-ir';

const VISIBILITY_MAP: Record<Visibility, string> = {
    '+': '+',
    '-': '-',
    '#': '#',
    '~': '~'
};

export function generateClassDiagram(ir: StructuralDiagramIR): string {
    const lines: string[] = ['@startuml'];

    // Add title if present
    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Skinparam for better styling
    lines.push('skinparam classAttributeIconSize 0');
    lines.push('skinparam classFontStyle bold');
    lines.push('hide empty members');
    lines.push('');

    // Generate elements (classes, interfaces, etc.)
    // Sort by name for deterministic output
    const sortedElements = [...ir.elements].sort((a, b) => a.name.localeCompare(b.name));

    for (const element of sortedElements) {
        lines.push(...generateElement(element));
        lines.push('');
    }

    // Generate relationships
    // Sort for deterministic output
    const sortedRelationships = [...ir.relationships].sort((a, b) => {
        const keyA = `${a.from}-${a.to}-${a.type}`;
        const keyB = `${b.from}-${b.to}-${b.type}`;
        return keyA.localeCompare(keyB);
    });

    for (const rel of sortedRelationships) {
        lines.push(generateRelationship(rel));
    }

    lines.push('@enduml');
    return lines.join('\n');
}

function generateElement(element: ClassElement): string[] {
    const lines: string[] = [];

    let declaration = '';
    switch (element.type) {
        case 'interface':
            declaration = `interface ${element.name}`;
            break;
        case 'abstract':
            declaration = `abstract class ${element.name}`;
            break;
        case 'enum':
            declaration = `enum ${element.name}`;
            break;
        default:
            declaration = `class ${element.name}`;
    }

    if (element.stereotype) {
        declaration += ` <<${element.stereotype}>>`;
    }

    lines.push(`${declaration} {`);

    // Enum values
    if (element.type === 'enum' && element.enumValues) {
        for (const value of element.enumValues) {
            lines.push(`  ${value}`);
        }
    }

    // Attributes (sorted for determinism)
    const sortedAttrs = [...element.attributes].sort((a, b) => a.name.localeCompare(b.name));
    for (const attr of sortedAttrs) {
        const visibility = VISIBILITY_MAP[attr.visibility];
        const staticMarker = attr.isStatic ? '{static} ' : '';
        const defaultVal = attr.defaultValue ? ` = ${attr.defaultValue}` : '';
        lines.push(`  ${staticMarker}${visibility}${attr.name} : ${attr.type}${defaultVal}`);
    }

    // Methods (sorted for determinism)
    const sortedMethods = [...element.methods].sort((a, b) => a.name.localeCompare(b.name));
    for (const method of sortedMethods) {
        const visibility = VISIBILITY_MAP[method.visibility];
        const staticMarker = method.isStatic ? '{static} ' : '';
        const abstractMarker = method.isAbstract ? '{abstract} ' : '';
        const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
        lines.push(`  ${staticMarker}${abstractMarker}${visibility}${method.name}(${params}) : ${method.returnType}`);
    }

    lines.push('}');
    return lines;
}

function generateRelationship(rel: Relationship): string {
    let arrow = '';

    switch (rel.type) {
        case 'inheritance':
            arrow = '--|>';
            break;
        case 'realization':
            arrow = '..|>';
            break;
        case 'composition':
            arrow = '*--';
            break;
        case 'aggregation':
            arrow = 'o--';
            break;
        case 'association':
            arrow = '--';
            break;
        case 'dependency':
            arrow = '..>';
            break;
    }

    let line = `${rel.from} ${arrow} ${rel.to}`;

    // Add multiplicity
    if (rel.multiplicity) {
        line = `${rel.from} "${rel.multiplicity.from}" ${arrow} "${rel.multiplicity.to}" ${rel.to}`;
    }

    // Add label
    if (rel.label) {
        line += ` : ${rel.label}`;
    }

    return line;
}

export default { generateClassDiagram };
