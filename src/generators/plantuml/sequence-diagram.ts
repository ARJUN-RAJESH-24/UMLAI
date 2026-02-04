import {
    SequenceDiagramIR,
    CommunicationDiagramIR,
    Participant,
    Message,
    CombinedFragment
} from '../../types/uml-ir';

const PARTICIPANT_TYPES: Record<string, string> = {
    'actor': 'actor',
    'participant': 'participant',
    'boundary': 'boundary',
    'control': 'control',
    'entity': 'entity',
    'database': 'database'
};

export function generateSequenceDiagram(ir: SequenceDiagramIR): string {
    const lines: string[] = ['@startuml'];

    // Add title if present
    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Skinparam for styling
    lines.push('skinparam sequenceMessageAlign center');
    lines.push('skinparam responseMessageBelowArrow true');
    lines.push('');

    // Generate participants in order
    for (const participant of ir.participants) {
        lines.push(generateParticipant(participant));
    }
    lines.push('');

    // Generate messages
    for (const message of ir.messages) {
        lines.push(generateMessage(message));
    }

    // Generate combined fragments
    if (ir.fragments && ir.fragments.length > 0) {
        lines.push('');
        for (const fragment of ir.fragments) {
            lines.push(...generateFragment(fragment));
        }
    }

    lines.push('@enduml');
    return lines.join('\n');
}

export function generateCommunicationDiagram(ir: CommunicationDiagramIR): string {
    // Communication diagrams are rendered as sequence diagrams with numbered messages
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Generate participants
    for (const participant of ir.participants) {
        lines.push(generateParticipant(participant));
    }
    lines.push('');

    // Generate numbered messages
    ir.messages.forEach((message, index) => {
        const numberedMessage = { ...message, label: `${index + 1}: ${message.label}` };
        lines.push(generateMessage(numberedMessage));
    });

    lines.push('@enduml');
    return lines.join('\n');
}

function generateParticipant(participant: Participant): string {
    const type = PARTICIPANT_TYPES[participant.type] || 'participant';
    const alias = participant.alias ? ` as ${participant.alias}` : '';
    return `${type} "${participant.name}"${alias}`;
}

function generateMessage(message: Message): string {
    const from = message.from;
    const to = message.to;
    let arrow = '';

    switch (message.type) {
        case 'sync':
            arrow = '->';
            break;
        case 'async':
            arrow = '->>';
            break;
        case 'return':
            arrow = '-->';
            break;
        case 'create':
            arrow = '->o';
            break;
        case 'destroy':
            arrow = '->x';
            break;
        default:
            arrow = '->';
    }

    return `${from} ${arrow} ${to} : ${message.label}`;
}

function generateFragment(fragment: CombinedFragment): string[] {
    const lines: string[] = [];

    const condition = fragment.condition ? ` ${fragment.condition}` : '';
    lines.push(`${fragment.type}${condition}`);

    for (const message of fragment.messages) {
        lines.push(`  ${generateMessage(message)}`);
    }

    if (fragment.type === 'alt' && fragment.elseMessages && fragment.elseMessages.length > 0) {
        lines.push('else');
        for (const message of fragment.elseMessages) {
            lines.push(`  ${generateMessage(message)}`);
        }
    }

    lines.push('end');
    return lines;
}

export default { generateSequenceDiagram, generateCommunicationDiagram };
