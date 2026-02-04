import {
    StateMachineDiagramIR,
    ActivityDiagramIR,
    State,
    Transition,
    ActivityNode,
    ActivityEdge
} from '../../types/uml-ir';

export function generateStateDiagram(ir: StateMachineDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Generate states
    for (const state of ir.states) {
        lines.push(...generateState(state));
    }
    lines.push('');

    // Generate transitions
    for (const transition of ir.transitions) {
        lines.push(generateTransition(transition, ir.states));
    }

    lines.push('@enduml');
    return lines.join('\n');
}

function generateState(state: State): string[] {
    const lines: string[] = [];

    if (state.isInitial) {
        lines.push(`[*] --> ${state.name}`);
        return lines;
    }

    if (state.isFinal) {
        // Final state is represented by target of transition, not declaration
        return lines;
    }

    // State with actions
    if (state.actions && (state.actions.entry || state.actions.exit || state.actions.do)) {
        lines.push(`state ${state.name} {`);
        if (state.actions.entry) {
            lines.push(`  ${state.name} : entry / ${state.actions.entry}`);
        }
        if (state.actions.do) {
            lines.push(`  ${state.name} : do / ${state.actions.do}`);
        }
        if (state.actions.exit) {
            lines.push(`  ${state.name} : exit / ${state.actions.exit}`);
        }
        lines.push('}');
    } else {
        lines.push(`state ${state.name}`);
    }

    return lines;
}

function generateTransition(transition: Transition, states: State[]): string {
    const fromState = states.find(s => s.name === transition.from);
    const toState = states.find(s => s.name === transition.to);

    const from = fromState?.isInitial ? '[*]' : transition.from;
    const to = toState?.isFinal ? '[*]' : transition.to;

    let label = '';
    if (transition.trigger || transition.guard || transition.action) {
        const parts: string[] = [];
        if (transition.trigger) parts.push(transition.trigger);
        if (transition.guard) parts.push(`[${transition.guard}]`);
        if (transition.action) parts.push(`/ ${transition.action}`);
        label = ` : ${parts.join(' ')}`;
    }

    return `${from} --> ${to}${label}`;
}

export function generateActivityDiagram(ir: ActivityDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Handle swimlanes
    if (ir.swimlanes && ir.swimlanes.length > 0) {
        for (const swimlane of ir.swimlanes) {
            lines.push(`|${swimlane.name}|`);
        }
        lines.push('');
    }

    // Start with initial node
    const initialNode = ir.nodes.find(n => n.type === 'initial');
    if (initialNode) {
        lines.push('start');
    }

    // Build node map for labels
    const nodeMap = new Map(ir.nodes.map(n => [n.id, n]));

    // Process edges to generate flow
    const processed = new Set<string>();
    const edgeMap = new Map<string, ActivityEdge[]>();

    for (const edge of ir.edges) {
        if (!edgeMap.has(edge.from)) {
            edgeMap.set(edge.from, []);
        }
        edgeMap.get(edge.from)!.push(edge);
    }

    // Generate activity flow
    function processNode(nodeId: string): void {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) return;

        // Generate node
        switch (node.type) {
            case 'action':
                lines.push(`:${node.label || node.id};`);
                break;
            case 'decision':
                lines.push(`if (${node.label || 'condition?'}) then (yes)`);
                break;
            case 'fork':
                lines.push('fork');
                break;
            case 'join':
                lines.push('end fork');
                break;
            case 'final':
                lines.push('stop');
                return;
            case 'flowFinal':
                lines.push('end');
                return;
        }

        // Process outgoing edges
        const outgoing = edgeMap.get(nodeId) || [];

        if (node.type === 'decision' && outgoing.length >= 2) {
            // Handle decision branches
            const yesEdge = outgoing[0];
            const noEdge = outgoing[1];

            processNode(yesEdge.to);

            lines.push('else (no)');
            processNode(noEdge.to);

            lines.push('endif');
        } else if (node.type === 'fork' && outgoing.length >= 2) {
            // Handle parallel branches
            for (let i = 0; i < outgoing.length; i++) {
                if (i > 0) lines.push('fork again');
                processNode(outgoing[i].to);
            }
        } else {
            for (const edge of outgoing) {
                processNode(edge.to);
            }
        }
    }

    // Start processing from initial node
    if (initialNode) {
        const initialEdges = edgeMap.get(initialNode.id) || [];
        for (const edge of initialEdges) {
            processNode(edge.to);
        }
    }

    lines.push('@enduml');
    return lines.join('\n');
}

export default { generateStateDiagram, generateActivityDiagram };
