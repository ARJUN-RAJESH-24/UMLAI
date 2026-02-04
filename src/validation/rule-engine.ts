import {
    UMLDiagramIR,
    StructuralDiagramIR,
    SequenceDiagramIR,
    StateMachineDiagramIR,
    ActivityDiagramIR,
    ERDiagramIR
} from '../types/uml-ir';

export interface RuleViolation {
    rule: string;
    message: string;
    severity: 'error' | 'warning';
    affected: string[];
}

export interface RuleEngineResult {
    valid: boolean;
    violations: RuleViolation[];
}

class RuleEngine {

    public validate(ir: UMLDiagramIR): RuleEngineResult {
        const violations: RuleViolation[] = [];

        switch (ir.diagramType) {
            case 'class':
            case 'object':
                violations.push(...this.validateStructural(ir as StructuralDiagramIR));
                break;
            case 'sequence':
            case 'communication':
                violations.push(...this.validateSequence(ir as SequenceDiagramIR));
                break;
            case 'state':
                violations.push(...this.validateStateMachine(ir as StateMachineDiagramIR));
                break;
            case 'activity':
                violations.push(...this.validateActivity(ir as ActivityDiagramIR));
                break;
            case 'er':
                violations.push(...this.validateER(ir as ERDiagramIR));
                break;
        }

        return {
            valid: violations.filter(v => v.severity === 'error').length === 0,
            violations
        };
    }

    private validateStructural(ir: StructuralDiagramIR): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const elementNames = new Set(ir.elements.map(e => e.name));

        // SR-3: Interfaces shall not contain instance attributes
        ir.elements.forEach(element => {
            if (element.type === 'interface') {
                const instanceAttrs = element.attributes.filter(a => !a.isStatic);
                if (instanceAttrs.length > 0) {
                    violations.push({
                        rule: 'SR-3-INTERFACE-ATTRS',
                        message: `Interface "${element.name}" contains instance attributes. Interfaces can only have static constants.`,
                        severity: 'error',
                        affected: [element.name, ...instanceAttrs.map(a => a.name)]
                    });
                }
            }
        });

        // SR-3: Check for circular inheritance
        const inheritanceGraph = new Map<string, string[]>();
        ir.relationships
            .filter(r => r.type === 'inheritance')
            .forEach(r => {
                if (!inheritanceGraph.has(r.from)) {
                    inheritanceGraph.set(r.from, []);
                }
                inheritanceGraph.get(r.from)!.push(r.to);
            });

        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        const hasCycle = (node: string): boolean => {
            if (recursionStack.has(node)) return true;
            if (visited.has(node)) return false;

            visited.add(node);
            recursionStack.add(node);

            const children = inheritanceGraph.get(node) || [];
            for (const child of children) {
                if (hasCycle(child)) return true;
            }

            recursionStack.delete(node);
            return false;
        };

        inheritanceGraph.forEach((_, node) => {
            if (hasCycle(node)) {
                violations.push({
                    rule: 'SR-3-CYCLIC-INHERITANCE',
                    message: `Cyclic inheritance detected involving "${node}"`,
                    severity: 'error',
                    affected: [node]
                });
            }
        });

        // Validate relationship references
        ir.relationships.forEach(rel => {
            if (!elementNames.has(rel.from)) {
                violations.push({
                    rule: 'REF-INVALID-FROM',
                    message: `Relationship references unknown element "${rel.from}"`,
                    severity: 'error',
                    affected: [rel.from]
                });
            }
            if (!elementNames.has(rel.to)) {
                violations.push({
                    rule: 'REF-INVALID-TO',
                    message: `Relationship references unknown element "${rel.to}"`,
                    severity: 'error',
                    affected: [rel.to]
                });
            }
        });

        return violations;
    }

    private validateSequence(ir: SequenceDiagramIR): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const participantNames = new Set(ir.participants.map(p => p.alias || p.name));

        // IR-1: Validate message references
        ir.messages.forEach((msg, index) => {
            if (!participantNames.has(msg.from)) {
                violations.push({
                    rule: 'IR-INVALID-FROM',
                    message: `Message ${index + 1} references unknown participant "${msg.from}"`,
                    severity: 'error',
                    affected: [msg.from]
                });
            }
            if (!participantNames.has(msg.to)) {
                violations.push({
                    rule: 'IR-INVALID-TO',
                    message: `Message ${index + 1} references unknown participant "${msg.to}"`,
                    severity: 'error',
                    affected: [msg.to]
                });
            }
        });

        // Validate fragments
        if (ir.fragments) {
            ir.fragments.forEach((frag, index) => {
                frag.messages.forEach(msg => {
                    if (!participantNames.has(msg.from) || !participantNames.has(msg.to)) {
                        violations.push({
                            rule: 'IR-FRAGMENT-INVALID-REF',
                            message: `Fragment ${index + 1} contains message with invalid participant reference`,
                            severity: 'error',
                            affected: [msg.from, msg.to]
                        });
                    }
                });
            });
        }

        return violations;
    }

    private validateStateMachine(ir: StateMachineDiagramIR): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const stateNames = new Set(ir.states.map(s => s.name));

        // BR-2: Check for initial state
        const initialStates = ir.states.filter(s => s.isInitial);
        if (initialStates.length === 0) {
            violations.push({
                rule: 'BR-2-NO-INITIAL',
                message: 'State machine must have at least one initial state',
                severity: 'error',
                affected: []
            });
        } else if (initialStates.length > 1) {
            violations.push({
                rule: 'BR-2-MULTIPLE-INITIAL',
                message: 'State machine should have only one initial state',
                severity: 'warning',
                affected: initialStates.map(s => s.name)
            });
        }

        // BR-3: States without transitions (unless terminal)
        const statesWithOutgoing = new Set(ir.transitions.map(t => t.from));
        ir.states.forEach(state => {
            if (!state.isFinal && !statesWithOutgoing.has(state.name)) {
                violations.push({
                    rule: 'BR-3-DEAD-STATE',
                    message: `State "${state.name}" has no outgoing transitions and is not marked as final`,
                    severity: 'warning',
                    affected: [state.name]
                });
            }
        });

        // Validate transition references
        ir.transitions.forEach(trans => {
            if (!stateNames.has(trans.from)) {
                violations.push({
                    rule: 'REF-INVALID-FROM',
                    message: `Transition from unknown state "${trans.from}"`,
                    severity: 'error',
                    affected: [trans.from]
                });
            }
            if (!stateNames.has(trans.to)) {
                violations.push({
                    rule: 'REF-INVALID-TO',
                    message: `Transition to unknown state "${trans.to}"`,
                    severity: 'error',
                    affected: [trans.to]
                });
            }
        });

        return violations;
    }

    private validateActivity(ir: ActivityDiagramIR): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const nodeIds = new Set(ir.nodes.map(n => n.id));

        // Check for initial node
        const initialNodes = ir.nodes.filter(n => n.type === 'initial');
        if (initialNodes.length === 0) {
            violations.push({
                rule: 'BR-1-NO-INITIAL',
                message: 'Activity diagram must have an initial node',
                severity: 'error',
                affected: []
            });
        }

        // Check for final node
        const finalNodes = ir.nodes.filter(n => n.type === 'final' || n.type === 'flowFinal');
        if (finalNodes.length === 0) {
            violations.push({
                rule: 'BR-1-NO-FINAL',
                message: 'Activity diagram should have at least one final node',
                severity: 'warning',
                affected: []
            });
        }

        // Validate edge references
        ir.edges.forEach(edge => {
            if (!nodeIds.has(edge.from)) {
                violations.push({
                    rule: 'REF-INVALID-FROM',
                    message: `Edge from unknown node "${edge.from}"`,
                    severity: 'error',
                    affected: [edge.from]
                });
            }
            if (!nodeIds.has(edge.to)) {
                violations.push({
                    rule: 'REF-INVALID-TO',
                    message: `Edge to unknown node "${edge.to}"`,
                    severity: 'error',
                    affected: [edge.to]
                });
            }
        });

        // Validate decision nodes have multiple outgoing edges
        const outgoingCount = new Map<string, number>();
        ir.edges.forEach(e => {
            outgoingCount.set(e.from, (outgoingCount.get(e.from) || 0) + 1);
        });

        ir.nodes.filter(n => n.type === 'decision').forEach(node => {
            const count = outgoingCount.get(node.id) || 0;
            if (count < 2) {
                violations.push({
                    rule: 'BR-1-DECISION-EDGES',
                    message: `Decision node "${node.id}" should have at least 2 outgoing edges`,
                    severity: 'warning',
                    affected: [node.id]
                });
            }
        });

        return violations;
    }

    private validateER(ir: ERDiagramIR): RuleViolation[] {
        const violations: RuleViolation[] = [];
        const entityNames = new Set(ir.entities.map(e => e.name));

        // DR-1: Each entity should have a primary key
        ir.entities.forEach(entity => {
            const hasPK = entity.attributes.some(a => a.isPrimaryKey);
            if (!hasPK) {
                violations.push({
                    rule: 'DR-1-NO-PRIMARY-KEY',
                    message: `Entity "${entity.name}" has no primary key defined`,
                    severity: 'warning',
                    affected: [entity.name]
                });
            }
        });

        // DR-2: Validate foreign key references
        ir.entities.forEach(entity => {
            entity.attributes.filter(a => a.isForeignKey).forEach(attr => {
                if (attr.references && !entityNames.has(attr.references)) {
                    violations.push({
                        rule: 'DR-2-INVALID-FK-REF',
                        message: `Foreign key "${attr.name}" in "${entity.name}" references unknown entity "${attr.references}"`,
                        severity: 'error',
                        affected: [entity.name, attr.name]
                    });
                }
            });
        });

        // Validate relationship references
        ir.relationships.forEach(rel => {
            if (!entityNames.has(rel.from)) {
                violations.push({
                    rule: 'REF-INVALID-FROM',
                    message: `Relationship references unknown entity "${rel.from}"`,
                    severity: 'error',
                    affected: [rel.from]
                });
            }
            if (!entityNames.has(rel.to)) {
                violations.push({
                    rule: 'REF-INVALID-TO',
                    message: `Relationship references unknown entity "${rel.to}"`,
                    severity: 'error',
                    affected: [rel.to]
                });
            }
        });

        return violations;
    }
}

export const ruleEngine = new RuleEngine();
export default ruleEngine;
