import { ERDiagramIR, Entity, EntityAttribute, EntityRelationship } from '../../types/uml-ir';

export function generateERDiagram(ir: ERDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Skinparam for ER style
    lines.push('skinparam class {');
    lines.push('  BackgroundColor White');
    lines.push('  BorderColor Black');
    lines.push('  ArrowColor Black');
    lines.push('}');
    lines.push('hide methods');
    lines.push('');

    // Generate entities as classes
    for (const entity of ir.entities) {
        lines.push(...generateEntity(entity));
        lines.push('');
    }

    // Generate relationships
    for (const rel of ir.relationships) {
        lines.push(generateRelationship(rel));
    }

    lines.push('@enduml');
    return lines.join('\n');
}

function generateEntity(entity: Entity): string[] {
    const lines: string[] = [];

    lines.push(`entity "${entity.name}" as ${entity.name.replace(/\s+/g, '_')} {`);

    // Separate PKs, FKs, and regular attributes
    const pkAttrs = entity.attributes.filter(a => a.isPrimaryKey);
    const fkAttrs = entity.attributes.filter(a => a.isForeignKey && !a.isPrimaryKey);
    const regularAttrs = entity.attributes.filter(a => !a.isPrimaryKey && !a.isForeignKey);

    // Primary keys first
    for (const attr of pkAttrs) {
        const nullable = attr.isNullable ? ' [N]' : '';
        lines.push(`  *${attr.name} : ${attr.type} <<PK>>${nullable}`);
    }

    // Separator if we have PKs and other attributes
    if (pkAttrs.length > 0 && (fkAttrs.length > 0 || regularAttrs.length > 0)) {
        lines.push('  --');
    }

    // Foreign keys
    for (const attr of fkAttrs) {
        const nullable = attr.isNullable ? ' [N]' : '';
        const ref = attr.references ? ` -> ${attr.references}` : '';
        lines.push(`  *${attr.name} : ${attr.type} <<FK>>${ref}${nullable}`);
    }

    // Regular attributes
    for (const attr of regularAttrs) {
        const nullable = attr.isNullable ? ' [N]' : '';
        const marker = attr.isNullable ? '' : '*';
        lines.push(`  ${marker}${attr.name} : ${attr.type}${nullable}`);
    }

    lines.push('}');
    return lines;
}

function generateRelationship(rel: EntityRelationship): string {
    const fromCard = mapCardinality(rel.fromCardinality);
    const toCard = mapCardinality(rel.toCardinality);

    let line = `${rel.from.replace(/\s+/g, '_')} "${fromCard}" -- "${toCard}" ${rel.to.replace(/\s+/g, '_')}`;

    if (rel.label) {
        line += ` : ${rel.label}`;
    }

    return line;
}

function mapCardinality(cardinality: string): string {
    const cardMap: Record<string, string> = {
        '1': '1',
        '0..1': '0..1',
        '*': '*',
        '1..*': '1..*',
        '0..*': '0..*'
    };
    return cardMap[cardinality] || cardinality;
}

export default { generateERDiagram };
