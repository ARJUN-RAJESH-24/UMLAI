import { DiagramType } from '../types/uml-ir';

const BASE_SYSTEM_PROMPT = `You are a UML diagram extraction expert. Your task is to analyze natural language software requirements and extract structured UML information.

CRITICAL RULES:
1. Output ONLY valid JSON matching the specified schema
2. Do NOT include any explanation or markdown formatting
3. Extract ONLY what is explicitly stated or clearly implied
4. If information is ambiguous, include a clarification request in the response
5. Use standard UML naming conventions (PascalCase for classes, camelCase for methods)

VISIBILITY MODIFIERS:
- + for public
- - for private
- # for protected
- ~ for package`;

const DIAGRAM_PROMPTS: Record<DiagramType, string> = {
    class: `Extract a UML Class Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "class",
  "title": "optional diagram title",
  "elements": [
    {
      "type": "class|interface|abstract|enum",
      "name": "ClassName",
      "stereotype": "optional stereotype",
      "attributes": [
        {"name": "attrName", "type": "dataType", "visibility": "+|-|#|~", "isStatic": false}
      ],
      "methods": [
        {"name": "methodName", "parameters": [{"name": "param", "type": "type"}], "returnType": "type", "visibility": "+", "isAbstract": false}
      ],
      "enumValues": ["VALUE1", "VALUE2"]  // only for enums
    }
  ],
  "relationships": [
    {"type": "association|aggregation|composition|inheritance|realization|dependency", "from": "Class1", "to": "Class2", "label": "optional", "multiplicity": {"from": "1", "to": "*"}}
  ]
}

RELATIONSHIP GUIDELINES:
- inheritance: subclass "extends" superclass
- realization: class "implements" interface
- composition: whole "contains" part (lifecycle dependency)
- aggregation: whole "has" part (no lifecycle dependency)
- association: classes are related
- dependency: class "uses" another`,

    object: `Extract a UML Object Diagram from the requirements.

OUTPUT SCHEMA: Same as class diagram but with "diagramType": "object"
Objects should be named instances like "order1: Order"`,

    sequence: `Extract a UML Sequence Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "sequence",
  "title": "optional title",
  "participants": [
    {"name": "ParticipantName", "alias": "optional", "type": "actor|participant|boundary|control|entity|database"}
  ],
  "messages": [
    {"from": "Sender", "to": "Receiver", "label": "message()", "type": "sync|async|return|create|destroy"}
  ],
  "fragments": [
    {"type": "alt|opt|loop|break|par|critical", "condition": "condition", "messages": [...], "elseMessages": [...]}
  ]
}`,

    communication: `Extract a UML Communication Diagram from the requirements.

OUTPUT SCHEMA: Same as sequence but with "diagramType": "communication"
Messages should be numbered to show order.`,

    state: `Extract a UML State Machine Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "state",
  "title": "optional title",
  "states": [
    {"name": "StateName", "isInitial": true|false, "isFinal": true|false, "actions": {"entry": "action", "exit": "action", "do": "action"}}
  ],
  "transitions": [
    {"from": "State1", "to": "State2", "trigger": "event", "guard": "condition", "action": "action"}
  ]
}`,

    activity: `Extract a UML Activity Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "activity",
  "title": "optional title",
  "nodes": [
    {"id": "node1", "type": "action|decision|fork|join|initial|final|flowFinal", "label": "description"}
  ],
  "edges": [
    {"from": "node1", "to": "node2", "guard": "optional condition"}
  ],
  "swimlanes": [
    {"name": "Actor/Role", "nodes": ["node1", "node2"]}
  ]
}`,

    component: `Extract a UML Component Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "component",
  "title": "optional title",
  "components": [
    {"name": "ComponentName", "stereotype": "optional", "provides": ["Interface1"], "requires": ["Interface2"]}
  ],
  "interfaces": [
    {"name": "InterfaceName"}
  ],
  "relationships": [
    {"type": "dependency|realization|uses", "from": "Comp1", "to": "Comp2", "label": "optional"}
  ]
}`,

    deployment: `Extract a UML Deployment Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "deployment",
  "title": "optional title",
  "nodes": [
    {"name": "NodeName", "type": "node|device|executionEnvironment", "stereotype": "optional", "deployedArtifacts": ["artifact1"]}
  ],
  "artifacts": ["artifact1.jar", "artifact2.war"],
  "communicationPaths": [
    {"from": "Node1", "to": "Node2", "protocol": "HTTP"}
  ]
}`,

    package: `Extract a UML Package Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "package",
  "title": "optional title",
  "packages": [
    {"name": "PackageName", "elements": ["Class1", "Class2"], "subpackages": [...]}
  ],
  "dependencies": [
    {"from": "Package1", "to": "Package2"}
  ]
}`,

    er: `Extract an ER (Entity-Relationship) Diagram from the requirements.

OUTPUT SCHEMA:
{
  "diagramType": "er",
  "title": "optional title",
  "entities": [
    {
      "name": "EntityName",
      "attributes": [
        {"name": "id", "type": "INT", "isPrimaryKey": true},
        {"name": "other_id", "type": "INT", "isForeignKey": true, "references": "OtherEntity"},
        {"name": "field", "type": "VARCHAR(255)", "isNullable": true}
      ]
    }
  ],
  "relationships": [
    {"from": "Entity1", "to": "Entity2", "fromCardinality": "1", "toCardinality": "*", "label": "has"}
  ]
}

CARDINALITY OPTIONS: "1", "0..1", "*", "1..*", "0..*"`
};

export function buildPrompt(diagramType: DiagramType, userInput: string): string {
    const diagramPrompt = DIAGRAM_PROMPTS[diagramType];

    if (!diagramPrompt) {
        throw new Error(`Unknown diagram type: ${diagramType}`);
    }

    return `${BASE_SYSTEM_PROMPT}

${diagramPrompt}

USER REQUIREMENTS:
${userInput}

Respond with ONLY the JSON object, no additional text.`;
}

export function getAvailableDiagramTypes(): DiagramType[] {
    return Object.keys(DIAGRAM_PROMPTS) as DiagramType[];
}

export default { buildPrompt, getAvailableDiagramTypes };
