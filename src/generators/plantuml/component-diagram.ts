import {
    ComponentDiagramIR,
    DeploymentDiagramIR,
    PackageDiagramIR
} from '../../types/uml-ir';

export function generateComponentDiagram(ir: ComponentDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Skinparam for styling
    lines.push('skinparam componentStyle rectangle');
    lines.push('');

    // Generate interfaces
    for (const iface of ir.interfaces) {
        lines.push(`interface "${iface.name}" as ${iface.name.replace(/\s+/g, '_')}`);
    }
    if (ir.interfaces.length > 0) lines.push('');

    // Generate components
    for (const component of ir.components) {
        let compLine = `[${component.name}]`;
        if (component.stereotype) {
            compLine = `[${component.name}] <<${component.stereotype}>>`;
        }
        lines.push(compLine);

        // Provided interfaces (lollipop)
        if (component.provides) {
            for (const iface of component.provides) {
                lines.push(`[${component.name}] -0)- ${iface.replace(/\s+/g, '_')}`);
            }
        }

        // Required interfaces (socket)
        if (component.requires) {
            for (const iface of component.requires) {
                lines.push(`[${component.name}] -( ${iface.replace(/\s+/g, '_')}`);
            }
        }
    }
    lines.push('');

    // Generate relationships
    for (const rel of ir.relationships) {
        let arrow = '';
        switch (rel.type) {
            case 'dependency':
                arrow = '..>';
                break;
            case 'realization':
                arrow = '..|>';
                break;
            case 'uses':
                arrow = '-->';
                break;
        }

        let line = `[${rel.from}] ${arrow} [${rel.to}]`;
        if (rel.label) {
            line += ` : ${rel.label}`;
        }
        lines.push(line);
    }

    lines.push('@enduml');
    return lines.join('\n');
}

export function generateDeploymentDiagram(ir: DeploymentDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Skinparam
    lines.push('skinparam nodeStyle rectangle');
    lines.push('');

    // Generate nodes
    for (const node of ir.nodes) {
        let nodeType = 'node';
        if (node.type === 'device') nodeType = 'node';
        if (node.type === 'executionEnvironment') nodeType = 'node';

        const stereotype = node.stereotype ? ` <<${node.stereotype}>>` : '';

        if (node.deployedArtifacts && node.deployedArtifacts.length > 0) {
            lines.push(`${nodeType} "${node.name}"${stereotype} {`);
            for (const artifact of node.deployedArtifacts) {
                lines.push(`  artifact "${artifact}"`);
            }
            lines.push('}');
        } else {
            lines.push(`${nodeType} "${node.name}"${stereotype}`);
        }
    }
    lines.push('');

    // Generate standalone artifacts
    for (const artifact of ir.artifacts) {
        const isDeployed = ir.nodes.some(n => n.deployedArtifacts?.includes(artifact));
        if (!isDeployed) {
            lines.push(`artifact "${artifact}"`);
        }
    }
    if (ir.artifacts.some(a => !ir.nodes.some(n => n.deployedArtifacts?.includes(a)))) {
        lines.push('');
    }

    // Generate communication paths
    for (const path of ir.communicationPaths) {
        let line = `"${path.from}" -- "${path.to}"`;
        if (path.protocol) {
            line += ` : <<${path.protocol}>>`;
        }
        lines.push(line);
    }

    lines.push('@enduml');
    return lines.join('\n');
}

export function generatePackageDiagram(ir: PackageDiagramIR): string {
    const lines: string[] = ['@startuml'];

    if (ir.title) {
        lines.push(`title ${ir.title}`);
        lines.push('');
    }

    // Generate packages recursively
    function generatePackage(pkg: PackageDiagramIR['packages'][0], indent: string = ''): void {
        lines.push(`${indent}package "${pkg.name}" {`);

        for (const element of pkg.elements) {
            lines.push(`${indent}  class ${element}`);
        }

        if (pkg.subpackages) {
            for (const subpkg of pkg.subpackages) {
                generatePackage(subpkg, indent + '  ');
            }
        }

        lines.push(`${indent}}`);
    }

    for (const pkg of ir.packages) {
        generatePackage(pkg);
        lines.push('');
    }

    // Generate dependencies
    for (const dep of ir.dependencies) {
        lines.push(`"${dep.from}" ..> "${dep.to}"`);
    }

    lines.push('@enduml');
    return lines.join('\n');
}

export default { generateComponentDiagram, generateDeploymentDiagram, generatePackageDiagram };
