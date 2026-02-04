import { UMLDiagramIR } from '../../types/uml-ir';
import { generateClassDiagram } from './class-diagram';
import { generateSequenceDiagram, generateCommunicationDiagram } from './sequence-diagram';
import { generateStateDiagram, generateActivityDiagram } from './activity-diagram';
import { generateComponentDiagram, generateDeploymentDiagram, generatePackageDiagram } from './component-diagram';
import { generateERDiagram } from './er-diagram';

export interface GeneratorResult {
    success: boolean;
    code?: string;
    error?: string;
}

export function generatePlantUML(ir: UMLDiagramIR): GeneratorResult {
    try {
        let code: string;

        switch (ir.diagramType) {
            case 'class':
            case 'object':
                code = generateClassDiagram(ir);
                break;
            case 'sequence':
                code = generateSequenceDiagram(ir);
                break;
            case 'communication':
                code = generateCommunicationDiagram(ir);
                break;
            case 'state':
                code = generateStateDiagram(ir);
                break;
            case 'activity':
                code = generateActivityDiagram(ir);
                break;
            case 'component':
                code = generateComponentDiagram(ir);
                break;
            case 'deployment':
                code = generateDeploymentDiagram(ir);
                break;
            case 'package':
                code = generatePackageDiagram(ir);
                break;
            case 'er':
                code = generateERDiagram(ir);
                break;
            default:
                return {
                    success: false,
                    error: `Unknown diagram type: ${(ir as any).diagramType}`
                };
        }

        return { success: true, code };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown generation error'
        };
    }
}

// Re-export individual generators
export {
    generateClassDiagram,
    generateSequenceDiagram,
    generateCommunicationDiagram,
    generateStateDiagram,
    generateActivityDiagram,
    generateComponentDiagram,
    generateDeploymentDiagram,
    generatePackageDiagram,
    generateERDiagram
};

export default { generatePlantUML };
