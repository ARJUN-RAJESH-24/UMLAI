// UML Intermediate Representation Types

// ============ COMMON TYPES ============
export type Visibility = '+' | '-' | '#' | '~'; // public, private, protected, package

export interface Attribute {
    name: string;
    type: string;
    visibility: Visibility;
    isStatic?: boolean;
    defaultValue?: string;
}

export interface Method {
    name: string;
    parameters: Parameter[];
    returnType: string;
    visibility: Visibility;
    isStatic?: boolean;
    isAbstract?: boolean;
}

export interface Parameter {
    name: string;
    type: string;
}

// ============ STRUCTURAL DIAGRAMS ============
export type ClassType = 'class' | 'interface' | 'abstract' | 'enum';

export interface ClassElement {
    type: ClassType;
    name: string;
    stereotype?: string;
    attributes: Attribute[];
    methods: Method[];
    enumValues?: string[]; // For enum types
}

export type RelationshipType =
    | 'association'
    | 'aggregation'
    | 'composition'
    | 'inheritance'
    | 'realization'
    | 'dependency';

export interface Multiplicity {
    from: string;
    to: string;
}

export interface Relationship {
    type: RelationshipType;
    from: string;
    to: string;
    label?: string;
    multiplicity?: Multiplicity;
    fromRole?: string;
    toRole?: string;
}

export interface StructuralDiagramIR {
    diagramType: 'class' | 'object';
    title?: string;
    elements: ClassElement[];
    relationships: Relationship[];
}

// ============ INTERACTION DIAGRAMS ============
export type MessageType = 'sync' | 'async' | 'return' | 'create' | 'destroy';

export interface Participant {
    name: string;
    alias?: string;
    type: 'actor' | 'participant' | 'boundary' | 'control' | 'entity' | 'database';
}

export interface Message {
    from: string;
    to: string;
    label: string;
    type: MessageType;
    number?: number;
}

export interface CombinedFragment {
    type: 'alt' | 'opt' | 'loop' | 'break' | 'par' | 'critical';
    condition?: string;
    messages: Message[];
    elseMessages?: Message[]; // For 'alt' fragments
}

export interface SequenceDiagramIR {
    diagramType: 'sequence';
    title?: string;
    participants: Participant[];
    messages: Message[];
    fragments?: CombinedFragment[];
}

export interface CommunicationDiagramIR {
    diagramType: 'communication';
    title?: string;
    participants: Participant[];
    messages: Message[];
}

// ============ BEHAVIORAL DIAGRAMS ============
export interface State {
    name: string;
    isInitial?: boolean;
    isFinal?: boolean;
    actions?: {
        entry?: string;
        exit?: string;
        do?: string;
    };
}

export interface Transition {
    from: string;
    to: string;
    trigger?: string;
    guard?: string;
    action?: string;
}

export interface StateMachineDiagramIR {
    diagramType: 'state';
    title?: string;
    states: State[];
    transitions: Transition[];
}

export interface ActivityNode {
    id: string;
    type: 'action' | 'decision' | 'fork' | 'join' | 'initial' | 'final' | 'flowFinal';
    label?: string;
}

export interface ActivityEdge {
    from: string;
    to: string;
    guard?: string;
    label?: string;
}

export interface Swimlane {
    name: string;
    nodes: string[]; // Node IDs
}

export interface ActivityDiagramIR {
    diagramType: 'activity';
    title?: string;
    nodes: ActivityNode[];
    edges: ActivityEdge[];
    swimlanes?: Swimlane[];
}

// ============ ARCHITECTURE DIAGRAMS ============
export interface Component {
    name: string;
    stereotype?: string;
    provides?: string[]; // Provided interfaces
    requires?: string[]; // Required interfaces
}

export interface Interface {
    name: string;
}

export interface ComponentRelationship {
    type: 'dependency' | 'realization' | 'uses';
    from: string;
    to: string;
    label?: string;
}

export interface ComponentDiagramIR {
    diagramType: 'component';
    title?: string;
    components: Component[];
    interfaces: Interface[];
    relationships: ComponentRelationship[];
}

export interface Node {
    name: string;
    type: 'node' | 'device' | 'executionEnvironment';
    stereotype?: string;
    deployedArtifacts?: string[];
}

export interface CommunicationPath {
    from: string;
    to: string;
    protocol?: string;
}

export interface DeploymentDiagramIR {
    diagramType: 'deployment';
    title?: string;
    nodes: Node[];
    artifacts: string[];
    communicationPaths: CommunicationPath[];
}

export interface Package {
    name: string;
    elements: string[]; // Class/component names
    subpackages?: Package[];
}

export interface PackageDiagramIR {
    diagramType: 'package';
    title?: string;
    packages: Package[];
    dependencies: { from: string; to: string }[];
}

// ============ DATA DIAGRAMS ============
export interface Entity {
    name: string;
    attributes: EntityAttribute[];
}

export interface EntityAttribute {
    name: string;
    type: string;
    isPrimaryKey?: boolean;
    isForeignKey?: boolean;
    isNullable?: boolean;
    references?: string; // For FK, the referenced entity
}

export type Cardinality = '1' | '0..1' | '*' | '1..*' | '0..*';

export interface EntityRelationship {
    from: string;
    to: string;
    fromCardinality: Cardinality;
    toCardinality: Cardinality;
    label?: string;
}

export interface ERDiagramIR {
    diagramType: 'er';
    title?: string;
    entities: Entity[];
    relationships: EntityRelationship[];
}

// ============ UNION TYPE ============
export type UMLDiagramIR =
    | StructuralDiagramIR
    | SequenceDiagramIR
    | CommunicationDiagramIR
    | StateMachineDiagramIR
    | ActivityDiagramIR
    | ComponentDiagramIR
    | DeploymentDiagramIR
    | PackageDiagramIR
    | ERDiagramIR;

export type DiagramType = UMLDiagramIR['diagramType'];
