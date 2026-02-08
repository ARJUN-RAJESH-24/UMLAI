/**
 * UML AI Generator - Main Application
 */

(function () {
    'use strict';

    // ============================================
    // Configuration & State
    // ============================================

    const CONFIG = {
        // Using Groq API - 14,400 free requests/day, no credit card required
        GROQ_API_URL: 'https://api.groq.com/openai/v1/chat/completions',
        GROQ_MODEL: 'llama-3.3-70b-versatile',
        PLANTUML_SERVER: 'https://www.plantuml.com/plantuml',
        LOCAL_STORAGE_KEY: 'umlai_api_key',
        LAYOUT_STORAGE_KEY: 'umlai_layout_settings',
        THEME_STORAGE_KEY: 'umlai_theme',
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 1000
    };

    const state = {
        apiKey: '',
        selectedDiagramType: 'class',
        currentIR: null,
        currentPlantUML: '',
        currentMDJ: '',
        currentInput: '',
        zoomLevel: 1,
        fullscreenZoom: 1,
        isLightTheme: false,
        layoutSettings: {
            direction: 'top-to-bottom',
            theme: 'default',
            shadows: true,
            handwritten: false,
            monochrome: false,
            lineType: 'ortho',
            ranksep: 50,
            nodesep: 30
        }
    };

    // ============================================
    // DOM Elements
    // ============================================

    const elements = {
        apiKey: null,
        toggleApiKey: null,
        diagramTypes: null,
        nlInput: null,
        charCount: null,
        generateBtn: null,
        codeOutput: null,
        diagramPreview: null,
        copyBtn: null,
        downloadPumlBtn: null,
        downloadSvgBtn: null,
        downloadPngBtn: null,
        downloadMdjBtn: null,
        zoomInBtn: null,
        zoomOutBtn: null,
        loadingOverlay: null,
        toast: null,
        validationMessages: null,
        validationList: null,
        // New elements
        themeToggle: null,
        shortcutHintBtn: null,
        examplesBtn: null,
        examplesDropdown: null,
        historyToggleBtn: null,
        historyPanel: null,
        historyPanelClose: null,
        historyList: null,
        historyClearBtn: null,
        panelOverlay: null,
        fullscreenBtn: null,
        fullscreenModal: null,
        fullscreenContainer: null,
        fullscreenClose: null,
        fullscreenZoomIn: null,
        fullscreenZoomOut: null
    };

    // ============================================
    // Layout Settings (preserves semantics)
    // ============================================

    const LAYOUT_PRESETS = {
        'top-to-bottom': 'top to bottom direction',
        'left-to-right': 'left to right direction',
        'bottom-to-top': 'bottom to top direction',
        'right-to-left': 'right to left direction'
    };

    const THEMES = {
        'default': '',
        'cerulean': '!theme cerulean',
        'superhero': '!theme superhero',
        'united': '!theme united',
        'sketchy': '!theme sketchy-outline',
        'blueprint': '!theme blueprint',
        'minty': '!theme minty',
        'cyborg': '!theme cyborg'
    };

    function applyLayoutToPlantUML(code, settings) {
        if (!code) return code;

        const lines = code.split('\n');
        const insertIndex = lines.findIndex(l => l.trim() === '@startuml') + 1;

        if (insertIndex === 0) return code;

        const layoutLines = [];

        // Direction
        if (settings.direction && LAYOUT_PRESETS[settings.direction]) {
            layoutLines.push(LAYOUT_PRESETS[settings.direction]);
        }

        // Theme
        if (settings.theme && THEMES[settings.theme]) {
            layoutLines.push(THEMES[settings.theme]);
        }

        // Skinparam settings
        if (settings.shadows === false) {
            layoutLines.push('skinparam shadowing false');
        }

        if (settings.handwritten) {
            layoutLines.push('skinparam handwritten true');
        }

        if (settings.monochrome) {
            layoutLines.push('skinparam monochrome true');
        }

        if (settings.lineType === 'polyline') {
            layoutLines.push('skinparam linetype polyline');
        } else if (settings.lineType === 'ortho') {
            layoutLines.push('skinparam linetype ortho');
        }

        // Spacing
        if (settings.ranksep && settings.ranksep !== 50) {
            layoutLines.push(`skinparam ranksep ${settings.ranksep}`);
        }

        if (settings.nodesep && settings.nodesep !== 30) {
            layoutLines.push(`skinparam nodesep ${settings.nodesep}`);
        }

        // Insert layout lines after @startuml
        if (layoutLines.length > 0) {
            lines.splice(insertIndex, 0, '', '\\' + "' Layout settings (visual only, doesn\\'t affect semantics)", ...layoutLines, '');
        }

        return lines.join('\n');
    }

    // ============================================
    // Prompt Templates
    // ============================================

    const DIAGRAM_PROMPTS = {
        class: `Extract a UML Class Diagram. Output JSON:
{
  "diagramType": "class",
  "title": "optional",
  "elements": [{"type": "class|interface|abstract|enum", "name": "Name", "attributes": [{"name": "attr", "type": "type", "visibility": "+|-|#|~"}], "methods": [{"name": "method", "parameters": [{"name": "p", "type": "t"}], "returnType": "type", "visibility": "+"}]}],
  "relationships": [{"type": "association|aggregation|composition|inheritance|realization|dependency", "from": "A", "to": "B", "label": "optional", "multiplicity": {"from": "1", "to": "*"}}]
}`,

        sequence: `Extract a UML Sequence Diagram. Output JSON:
{
  "diagramType": "sequence",
  "title": "optional",
  "participants": [{"name": "Name", "type": "actor|participant|boundary|control|entity|database"}],
  "messages": [{"from": "A", "to": "B", "label": "message()", "type": "sync|async|return"}],
  "fragments": [{"type": "alt|opt|loop", "condition": "cond", "messages": [...]}]
}`,

        state: `Extract a UML State Machine Diagram. Output JSON:
{
  "diagramType": "state",
  "title": "optional",
  "states": [{"name": "State", "isInitial": false, "isFinal": false}],
  "transitions": [{"from": "S1", "to": "S2", "trigger": "event", "guard": "condition"}]
}`,

        activity: `Extract a UML Activity Diagram. Output JSON:
{
  "diagramType": "activity",
  "title": "optional",
  "nodes": [{"id": "n1", "type": "action|decision|fork|join|initial|final", "label": "desc"}],
  "edges": [{"from": "n1", "to": "n2", "guard": "optional"}]
}`,

        component: `Extract a UML Component Diagram. Output JSON:
{
  "diagramType": "component",
  "title": "optional",
  "components": [{"name": "Comp", "provides": ["IFace"], "requires": ["IFace2"]}],
  "interfaces": [{"name": "IFace"}],
  "relationships": [{"type": "dependency|uses", "from": "A", "to": "B"}]
}`,

        deployment: `Extract a UML Deployment Diagram. Output JSON:
{
  "diagramType": "deployment",
  "title": "optional",
  "nodes": [{"name": "Server", "type": "node|device", "deployedArtifacts": ["app.war"]}],
  "artifacts": ["app.war"],
  "communicationPaths": [{"from": "N1", "to": "N2", "protocol": "HTTP"}]
}`,

        package: `Extract a UML Package Diagram. Output JSON:
{
  "diagramType": "package",
  "title": "optional",
  "packages": [{"name": "Pkg", "elements": ["Class1"], "subpackages": []}],
  "dependencies": [{"from": "Pkg1", "to": "Pkg2"}]
}`,

        er: `Extract an ER Diagram. Output JSON:
{
  "diagramType": "er",
  "title": "optional",
  "entities": [{"name": "Entity", "attributes": [{"name": "id", "type": "INT", "isPrimaryKey": true}]}],
  "relationships": [{"from": "E1", "to": "E2", "fromCardinality": "1", "toCardinality": "*", "label": "has"}]
}`
    };

    // ============================================
    // PlantUML Generators
    // ============================================

    const generators = {
        class: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            lines.push('skinparam classAttributeIconSize 0', 'hide empty members', '');

            const visMap = { '+': '+', '-': '-', '#': '#', '~': '~' };

            for (const el of (ir.elements || [])) {
                let decl = el.type === 'interface' ? `interface ${el.name}` :
                    el.type === 'abstract' ? `abstract class ${el.name}` :
                        el.type === 'enum' ? `enum ${el.name}` : `class ${el.name}`;
                if (el.stereotype) decl += ` <<${el.stereotype}>>`;

                lines.push(`${decl} {`);

                for (const attr of (el.attributes || [])) {
                    const vis = visMap[attr.visibility] || '+';
                    const stat = attr.isStatic ? '{static} ' : '';
                    lines.push(`  ${stat}${vis}${attr.name} : ${attr.type}`);
                }

                for (const m of (el.methods || [])) {
                    const vis = visMap[m.visibility] || '+';
                    const params = (m.parameters || []).map(p => `${p.name}: ${p.type}`).join(', ');
                    lines.push(`  ${vis}${m.name}(${params}) : ${m.returnType || 'void'}`);
                }

                lines.push('}', '');
            }

            const arrows = {
                inheritance: '--|>',
                realization: '..|>',
                composition: '*--',
                aggregation: 'o--',
                association: '--',
                dependency: '..>'
            };

            for (const rel of (ir.relationships || [])) {
                const arrow = arrows[rel.type] || '--';
                let line = rel.multiplicity
                    ? `${rel.from} "${rel.multiplicity.from}" ${arrow} "${rel.multiplicity.to}" ${rel.to}`
                    : `${rel.from} ${arrow} ${rel.to}`;
                if (rel.label) line += ` : ${rel.label}`;
                lines.push(line);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        sequence: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            for (const p of (ir.participants || [])) {
                const type = p.type || 'participant';
                lines.push(`${type} "${p.name}"${p.alias ? ` as ${p.alias}` : ''}`);
            }
            lines.push('');

            const arrows = { sync: '->', async: '->>', return: '-->', create: '->o', destroy: '->x' };

            for (const m of (ir.messages || [])) {
                const arrow = arrows[m.type] || '->';
                lines.push(`${m.from} ${arrow} ${m.to} : ${m.label}`);
            }

            for (const f of (ir.fragments || [])) {
                const cond = f.condition ? ` ${f.condition}` : '';
                lines.push(`${f.type}${cond}`);
                for (const m of (f.messages || [])) {
                    const arrow = arrows[m.type] || '->';
                    lines.push(`  ${m.from} ${arrow} ${m.to} : ${m.label}`);
                }
                if (f.type === 'alt' && f.elseMessages) {
                    lines.push('else');
                    for (const m of f.elseMessages) {
                        const arrow = arrows[m.type] || '->';
                        lines.push(`  ${m.from} ${arrow} ${m.to} : ${m.label}`);
                    }
                }
                lines.push('end');
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        state: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            const stateMap = new Map((ir.states || []).map(s => [s.name, s]));

            for (const s of (ir.states || [])) {
                if (s.isInitial) {
                    const trans = (ir.transitions || []).find(t => t.from === s.name);
                    if (trans) lines.push(`[*] --> ${trans.to}`);
                } else if (!s.isFinal) {
                    if (s.actions) {
                        lines.push(`state ${s.name} {`);
                        if (s.actions.entry) lines.push(`  ${s.name} : entry / ${s.actions.entry}`);
                        if (s.actions.do) lines.push(`  ${s.name} : do / ${s.actions.do}`);
                        if (s.actions.exit) lines.push(`  ${s.name} : exit / ${s.actions.exit}`);
                        lines.push('}');
                    } else {
                        lines.push(`state ${s.name}`);
                    }
                }
            }
            lines.push('');

            for (const t of (ir.transitions || [])) {
                const fromState = stateMap.get(t.from);
                const toState = stateMap.get(t.to);
                if (fromState?.isInitial) continue;

                const from = fromState?.isInitial ? '[*]' : t.from;
                const to = toState?.isFinal ? '[*]' : t.to;

                let label = '';
                const parts = [];
                if (t.trigger) parts.push(t.trigger);
                if (t.guard) parts.push(`[${t.guard}]`);
                if (t.action) parts.push(`/ ${t.action}`);
                if (parts.length) label = ` : ${parts.join(' ')}`;

                lines.push(`${from} --> ${to}${label}`);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        activity: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            const nodeMap = new Map((ir.nodes || []).map(n => [n.id, n]));
            const edgeMap = new Map();
            for (const e of (ir.edges || [])) {
                if (!edgeMap.has(e.from)) edgeMap.set(e.from, []);
                edgeMap.get(e.from).push(e);
            }

            const initial = (ir.nodes || []).find(n => n.type === 'initial');
            if (initial) lines.push('start');

            const processed = new Set();

            function processNode(id) {
                if (processed.has(id)) return;
                processed.add(id);

                const node = nodeMap.get(id);
                if (!node) return;

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
                }

                const outgoing = edgeMap.get(id) || [];

                if (node.type === 'decision' && outgoing.length >= 2) {
                    processNode(outgoing[0].to);
                    lines.push('else (no)');
                    processNode(outgoing[1].to);
                    lines.push('endif');
                } else if (node.type === 'fork') {
                    for (let i = 0; i < outgoing.length; i++) {
                        if (i > 0) lines.push('fork again');
                        processNode(outgoing[i].to);
                    }
                } else {
                    for (const e of outgoing) processNode(e.to);
                }
            }

            if (initial) {
                const startEdges = edgeMap.get(initial.id) || [];
                for (const e of startEdges) processNode(e.to);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        component: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');
            lines.push('skinparam componentStyle rectangle', '');

            for (const i of (ir.interfaces || [])) {
                lines.push(`interface "${i.name}" as ${i.name.replace(/\s+/g, '_')}`);
            }
            if ((ir.interfaces || []).length) lines.push('');

            for (const c of (ir.components || [])) {
                let line = `[${c.name}]`;
                if (c.stereotype) line = `[${c.name}] <<${c.stereotype}>>`;
                lines.push(line);
                for (const p of (c.provides || [])) {
                    lines.push(`[${c.name}] -0)- ${p.replace(/\s+/g, '_')}`);
                }
                for (const r of (c.requires || [])) {
                    lines.push(`[${c.name}] -( ${r.replace(/\s+/g, '_')}`);
                }
            }
            lines.push('');

            const arrows = { dependency: '..>', realization: '..|>', uses: '-->' };
            for (const rel of (ir.relationships || [])) {
                const arrow = arrows[rel.type] || '-->';
                let line = `[${rel.from}] ${arrow} [${rel.to}]`;
                if (rel.label) line += ` : ${rel.label}`;
                lines.push(line);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        deployment: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            for (const n of (ir.nodes || [])) {
                const stereo = n.stereotype ? ` <<${n.stereotype}>>` : '';
                if (n.deployedArtifacts?.length) {
                    lines.push(`node "${n.name}"${stereo} {`);
                    for (const a of n.deployedArtifacts) {
                        lines.push(`  artifact "${a}"`);
                    }
                    lines.push('}');
                } else {
                    lines.push(`node "${n.name}"${stereo}`);
                }
            }
            lines.push('');

            for (const p of (ir.communicationPaths || [])) {
                let line = `"${p.from}" -- "${p.to}"`;
                if (p.protocol) line += ` : <<${p.protocol}>>`;
                lines.push(line);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        package: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');

            function genPkg(pkg, indent = '') {
                lines.push(`${indent}package "${pkg.name}" {`);
                for (const el of (pkg.elements || [])) {
                    lines.push(`${indent}  class ${el}`);
                }
                for (const sub of (pkg.subpackages || [])) {
                    genPkg(sub, indent + '  ');
                }
                lines.push(`${indent}}`);
            }

            for (const pkg of (ir.packages || [])) {
                genPkg(pkg);
                lines.push('');
            }

            for (const dep of (ir.dependencies || [])) {
                lines.push(`"${dep.from}" ..> "${dep.to}"`);
            }

            lines.push('@enduml');
            return lines.join('\n');
        },

        er: (ir) => {
            const lines = ['@startuml'];
            if (ir.title) lines.push(`title ${ir.title}`, '');
            lines.push('hide methods', '');

            for (const e of (ir.entities || [])) {
                lines.push(`entity "${e.name}" as ${e.name.replace(/\s+/g, '_')} {`);

                const pks = (e.attributes || []).filter(a => a.isPrimaryKey);
                const others = (e.attributes || []).filter(a => !a.isPrimaryKey);

                for (const a of pks) {
                    lines.push(`  *${a.name} : ${a.type} <<PK>>`);
                }
                if (pks.length && others.length) lines.push('  --');

                for (const a of others) {
                    const marker = a.isForeignKey ? ' <<FK>>' : '';
                    const nullable = a.isNullable ? '' : '*';
                    lines.push(`  ${nullable}${a.name} : ${a.type}${marker}`);
                }

                lines.push('}', '');
            }

            for (const r of (ir.relationships || [])) {
                let line = `${r.from.replace(/\s+/g, '_')} "${r.fromCardinality}" -- "${r.toCardinality}" ${r.to.replace(/\s+/g, '_')}`;
                if (r.label) line += ` : ${r.label}`;
                lines.push(line);
            }

            lines.push('@enduml');
            return lines.join('\n');
        }
    };

    function generatePlantUML(ir) {
        const gen = generators[ir.diagramType];
        if (!gen) throw new Error(`Unknown diagram type: ${ir.diagramType}`);
        return gen(ir);
    }

    // ============================================
    // StarUML MDJ Generator
    // ============================================

    let mdjIdCounter = 0;

    function generateMDJId() {
        return `AAAA${String(++mdjIdCounter).padStart(20, '0')}`;
    }

    function generateStarUMLMDJ(ir) {
        mdjIdCounter = 0;

        const projectId = generateMDJId();
        const modelId = generateMDJId();

        const project = {
            _type: 'Project',
            _id: projectId,
            name: ir.title || 'UML Project',
            ownedElements: [{
                _type: 'UMLModel',
                _id: modelId,
                _parent: { $ref: projectId },
                name: 'Model',
                ownedElements: []
            }]
        };

        const model = project.ownedElements[0];

        // Add basic structure based on diagram type
        if (ir.diagramType === 'class' || ir.diagramType === 'object') {
            for (const el of (ir.elements || [])) {
                const elId = generateMDJId();
                const umlType = el.type === 'interface' ? 'UMLInterface' : 'UMLClass';
                model.ownedElements.push({
                    _type: umlType,
                    _id: elId,
                    _parent: { $ref: modelId },
                    name: el.name,
                    isAbstract: el.type === 'abstract'
                });
            }
        }

        return JSON.stringify(project, null, 2);
    }

    // ============================================
    // API & Generation
    // ============================================

    async function callLLMAPI(prompt, retryCount = 0) {
        if (!state.apiKey) {
            throw new Error('Please enter your Groq API key');
        }

        try {
            const response = await fetch(CONFIG.GROQ_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.GROQ_MODEL,
                    messages: [
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 8192
                })
            });

            if (!response.ok) {
                const error = await response.json();
                const errorMessage = error.error?.message || 'API request failed';

                // Handle rate limits with retry
                if (response.status === 429 && retryCount < CONFIG.MAX_RETRIES) {
                    const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount);
                    showToast(`Rate limited. Retrying in ${delay / 1000}s... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'info');
                    await new Promise(r => setTimeout(r, delay));
                    return callLLMAPI(prompt, retryCount + 1);
                }

                // Handle server errors with retry
                if (response.status >= 500 && retryCount < CONFIG.MAX_RETRIES) {
                    const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount);
                    showToast(`Server error. Retrying in ${delay / 1000}s... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'info');
                    await new Promise(r => setTimeout(r, delay));
                    return callLLMAPI(prompt, retryCount + 1);
                }

                // Provide helpful error messages
                if (response.status === 401) {
                    throw new Error('Invalid API key. Please check your Groq API key.');
                } else if (response.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a moment and try again.');
                } else {
                    throw new Error(errorMessage);
                }
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || '';
        } catch (error) {
            // Network errors - retry
            if (error.name === 'TypeError' && retryCount < CONFIG.MAX_RETRIES) {
                const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, retryCount);
                showToast(`Network error. Retrying in ${delay / 1000}s... (${retryCount + 1}/${CONFIG.MAX_RETRIES})`, 'info');
                await new Promise(r => setTimeout(r, delay));
                return callLLMAPI(prompt, retryCount + 1);
            }
            throw error;
        }
    }

    function parseIRFromResponse(text) {
        let jsonStr = text.trim();

        // Remove markdown code blocks
        const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1].trim();

        // Find JSON object
        const objMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (objMatch) jsonStr = objMatch[0];

        return JSON.parse(jsonStr);
    }

    async function generateUML() {
        const input = elements.nlInput.value.trim();

        if (!input) {
            showToast('Please enter a description', 'error');
            return;
        }

        if (!state.apiKey) {
            showToast('Please enter your Groq API key', 'error');
            elements.apiKey.focus();
            return;
        }

        showLoading(true);
        hideValidation();
        state.currentInput = input;

        try {
            const systemPrompt = `You are a UML extraction expert. Output ONLY valid JSON, no explanation.
Visibility: + public, - private, # protected, ~ package.
${DIAGRAM_PROMPTS[state.selectedDiagramType]}`;

            const fullPrompt = `${systemPrompt}\n\nREQUIREMENTS:\n${input}\n\nRespond with ONLY JSON:`;

            const response = await callLLMAPI(fullPrompt);
            const ir = parseIRFromResponse(response);

            state.currentIR = ir;

            // Generate PlantUML
            let plantUML = generatePlantUML(ir);

            // Apply layout settings (visual only, doesn't change IR)
            plantUML = applyLayoutToPlantUML(plantUML, state.layoutSettings);
            state.currentPlantUML = plantUML;

            // Generate StarUML MDJ
            state.currentMDJ = generateStarUMLMDJ(ir);

            // Update UI with syntax highlighting
            updateCodeOutput(plantUML);

            // Render diagram
            await renderDiagram(plantUML);

            // Save to history
            if (window.HistoryManager) {
                window.HistoryManager.saveToHistory({
                    input: input,
                    diagramType: state.selectedDiagramType,
                    ir: ir,
                    plantUML: plantUML,
                    mdj: state.currentMDJ
                });
                updateHistoryPanel();
            }

            showToast('UML generated successfully!', 'success');

        } catch (error) {
            console.error('Generation error:', error);
            showValidation([error.message]);
            showToast('Generation failed: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // Syntax highlighting for PlantUML code
    function updateCodeOutput(code) {
        const keywords = ['@startuml', '@enduml', 'class', 'interface', 'abstract', 'enum', 'package',
            'entity', 'participant', 'actor', 'database', 'node', 'component', 'state',
            'start', 'stop', 'if', 'then', 'else', 'endif', 'fork', 'end', 'alt', 'loop', 'opt'];
        const operators = ['->', '-->', '--|>', '..|>', '*--', 'o--', '--', '..', '-0)-', '-('];

        let highlighted = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Highlight comments
        highlighted = highlighted.replace(/('\..*$)/gm, '<span class="comment">$1</span>');
        highlighted = highlighted.replace(/(^\s*'.*$)/gm, '<span class="comment">$1</span>');

        // Highlight annotations
        highlighted = highlighted.replace(/(@\w+)/g, '<span class="annotation">$1</span>');

        // Highlight keywords
        keywords.forEach(kw => {
            const regex = new RegExp(`\\b(${kw})\\b`, 'gi');
            highlighted = highlighted.replace(regex, '<span class="keyword">$1</span>');
        });

        // Highlight strings
        highlighted = highlighted.replace(/("[^"]*")/g, '<span class="string">$1</span>');

        // Highlight types after colon
        highlighted = highlighted.replace(/: (\w+)/g, ': <span class="type">$1</span>');

        elements.codeOutput.querySelector('code').innerHTML = highlighted;
    }

    async function renderDiagram(plantUML) {
        try {
            const url = await PlantUMLEncoder.getUrl(plantUML, 'svg');

            const img = document.createElement('img');
            img.src = url;
            img.alt = 'UML Diagram';
            img.style.transform = `scale(${state.zoomLevel})`;
            img.style.transformOrigin = 'center center';

            img.onerror = () => {
                elements.diagramPreview.innerHTML = `
          <div class="preview-placeholder">
            <p>Failed to render diagram. Check the PlantUML code for errors.</p>
          </div>
        `;
            };

            elements.diagramPreview.innerHTML = '';
            elements.diagramPreview.appendChild(img);

        } catch (error) {
            console.error('Render error:', error);
            elements.diagramPreview.innerHTML = `
        <div class="preview-placeholder">
          <p>Error rendering diagram: ${error.message}</p>
        </div>
      `;
        }
    }

    // ============================================
    // Layout Controls UI
    // ============================================

    function createLayoutControls() {
        const container = document.createElement('div');
        container.className = 'layout-controls';
        container.innerHTML = `
      <div class="layout-header">
        <h3>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
          </svg>
          Layout (Visual Only)
        </h3>
        <button id="toggleLayout" class="action-btn" title="Toggle layout panel">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div class="layout-body" id="layoutBody">
        <div class="layout-row">
          <label>Direction</label>
          <select id="layoutDirection">
            <option value="top-to-bottom">Top to Bottom</option>
            <option value="left-to-right">Left to Right</option>
            <option value="bottom-to-top">Bottom to Top</option>
            <option value="right-to-left">Right to Left</option>
          </select>
        </div>
        <div class="layout-row">
          <label>Theme</label>
          <select id="layoutTheme">
            <option value="default">Default</option>
            <option value="cerulean">Cerulean</option>
            <option value="superhero">Superhero</option>
            <option value="blueprint">Blueprint</option>
            <option value="sketchy">Sketchy</option>
            <option value="minty">Minty</option>
            <option value="cyborg">Cyborg</option>
          </select>
        </div>
        <div class="layout-row">
          <label>Line Type</label>
          <select id="layoutLineType">
            <option value="ortho">Orthogonal</option>
            <option value="polyline">Polyline</option>
            <option value="default">Default</option>
          </select>
        </div>
        <div class="layout-row checkboxes">
          <label><input type="checkbox" id="layoutHandwritten"> Handwritten</label>
          <label><input type="checkbox" id="layoutMonochrome"> Monochrome</label>
          <label><input type="checkbox" id="layoutShadows" checked> Shadows</label>
        </div>
        <button id="applyLayout" class="apply-layout-btn">Apply Layout</button>
      </div>
    `;

        // Insert after diagram selector
        const diagramSelector = document.querySelector('.diagram-selector');
        diagramSelector.parentNode.insertBefore(container, diagramSelector.nextSibling);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
      .layout-controls {
        background: var(--bg-glass);
        border: 1px solid var(--bg-glass-border);
        border-radius: var(--radius-xl);
        backdrop-filter: blur(10px);
        margin-bottom: var(--space-lg);
        overflow: hidden;
      }
      .layout-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: var(--space-md) var(--space-lg);
        cursor: pointer;
      }
      .layout-header h3 {
        display: flex;
        align-items: center;
        gap: var(--space-sm);
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--text-secondary);
      }
      .layout-header h3 svg {
        width: 18px;
        height: 18px;
      }
      .layout-body {
        padding: var(--space-md) var(--space-lg);
        border-top: 1px solid var(--bg-glass-border);
        display: none;
      }
      .layout-body.open {
        display: block;
      }
      .layout-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--space-md);
      }
      .layout-row label {
        font-size: 0.875rem;
        color: var(--text-secondary);
      }
      .layout-row select {
        padding: var(--space-sm) var(--space-md);
        background: var(--bg-tertiary);
        border: 1px solid var(--bg-glass-border);
        border-radius: var(--radius-md);
        color: var(--text-primary);
        font-size: 0.8125rem;
        cursor: pointer;
      }
      .layout-row.checkboxes {
        flex-wrap: wrap;
        gap: var(--space-md);
      }
      .layout-row.checkboxes label {
        display: flex;
        align-items: center;
        gap: var(--space-xs);
        cursor: pointer;
      }
      .apply-layout-btn {
        width: 100%;
        padding: var(--space-sm);
        background: var(--accent-gradient);
        border: none;
        border-radius: var(--radius-md);
        color: white;
        font-weight: 600;
        cursor: pointer;
        transition: all var(--transition-fast);
      }
      .apply-layout-btn:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-glow);
      }
    `;
        document.head.appendChild(style);

        // Event listeners
        document.getElementById('toggleLayout').addEventListener('click', () => {
            document.getElementById('layoutBody').classList.toggle('open');
        });

        document.getElementById('applyLayout').addEventListener('click', () => {
            state.layoutSettings = {
                direction: document.getElementById('layoutDirection').value,
                theme: document.getElementById('layoutTheme').value,
                lineType: document.getElementById('layoutLineType').value,
                handwritten: document.getElementById('layoutHandwritten').checked,
                monochrome: document.getElementById('layoutMonochrome').checked,
                shadows: document.getElementById('layoutShadows').checked,
                ranksep: 50,
                nodesep: 30
            };

            if (state.currentIR) {
                // Re-generate with new layout (IR unchanged)
                let plantUML = generatePlantUML(state.currentIR);
                plantUML = applyLayoutToPlantUML(plantUML, state.layoutSettings);
                state.currentPlantUML = plantUML;
                elements.codeOutput.querySelector('code').textContent = plantUML;
                renderDiagram(plantUML);
                showToast('Layout applied!', 'success');
            }

            // Save preferences
            localStorage.setItem(CONFIG.LAYOUT_STORAGE_KEY, JSON.stringify(state.layoutSettings));
        });
    }

    // ============================================
    // UI Helpers
    // ============================================

    function showLoading(show) {
        elements.loadingOverlay.classList.toggle('hidden', !show);
    }

    function showToast(message, type = 'info') {
        elements.toast.textContent = message;
        elements.toast.className = `toast ${type}`;
        elements.toast.classList.remove('hidden');
        elements.toast.classList.add('show');

        setTimeout(() => {
            elements.toast.classList.remove('show');
            setTimeout(() => elements.toast.classList.add('hidden'), 300);
        }, 3000);
    }

    function showValidation(errors) {
        if (!errors || errors.length === 0) {
            hideValidation();
            return;
        }

        elements.validationList.innerHTML = errors.map(e => `<li>${e}</li>`).join('');
        elements.validationMessages.classList.remove('hidden');
    }

    function hideValidation() {
        elements.validationMessages.classList.add('hidden');
    }

    function downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function downloadImage(format) {
        if (!state.currentPlantUML) {
            showToast('Generate a diagram first', 'error');
            return;
        }

        try {
            const url = await PlantUMLEncoder.getUrl(state.currentPlantUML, format);
            const response = await fetch(url);
            const blob = await response.blob();

            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `diagram.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);

            showToast(`${format.toUpperCase()} downloaded!`, 'success');
        } catch (error) {
            showToast('Download failed: ' + error.message, 'error');
        }
    }

    // ============================================
    // Event Handlers
    // ============================================

    function setupEventListeners() {
        // API Key
        elements.apiKey.addEventListener('input', (e) => {
            state.apiKey = e.target.value;
            localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, state.apiKey);
        });

        elements.toggleApiKey.addEventListener('click', () => {
            const input = elements.apiKey;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';

            const openEye = elements.toggleApiKey.querySelector('.eye-open');
            const closedEye = elements.toggleApiKey.querySelector('.eye-closed');
            openEye.style.display = isPassword ? 'none' : 'block';
            closedEye.style.display = isPassword ? 'block' : 'none';
        });

        // Diagram type selection
        elements.diagramTypes.addEventListener('click', (e) => {
            const btn = e.target.closest('.diagram-type-btn');
            if (!btn) return;

            document.querySelectorAll('.diagram-type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedDiagramType = btn.dataset.type;
        });

        // Character count
        elements.nlInput.addEventListener('input', () => {
            elements.charCount.textContent = elements.nlInput.value.length;
        });

        // Generate
        elements.generateBtn.addEventListener('click', generateUML);

        // Copy
        elements.copyBtn.addEventListener('click', () => {
            if (!state.currentPlantUML) {
                showToast('Nothing to copy', 'error');
                return;
            }
            navigator.clipboard.writeText(state.currentPlantUML);
            showToast('Copied to clipboard!', 'success');
        });

        // Downloads
        elements.downloadPumlBtn.addEventListener('click', () => {
            if (!state.currentPlantUML) {
                showToast('Generate a diagram first', 'error');
                return;
            }
            downloadFile(state.currentPlantUML, 'diagram.puml', 'text/plain');
            showToast('PlantUML file downloaded!', 'success');
        });

        elements.downloadSvgBtn.addEventListener('click', () => downloadImage('svg'));
        elements.downloadPngBtn.addEventListener('click', () => downloadImage('png'));

        elements.downloadMdjBtn.addEventListener('click', () => {
            if (!state.currentMDJ) {
                showToast('Generate a diagram first', 'error');
                return;
            }
            downloadFile(state.currentMDJ, 'diagram.mdj', 'application/json');
            showToast('StarUML file downloaded!', 'success');
        });

        // Zoom
        elements.zoomInBtn.addEventListener('click', () => {
            state.zoomLevel = Math.min(3, state.zoomLevel + 0.25);
            const img = elements.diagramPreview.querySelector('img');
            if (img) img.style.transform = `scale(${state.zoomLevel})`;
        });

        elements.zoomOutBtn.addEventListener('click', () => {
            state.zoomLevel = Math.max(0.25, state.zoomLevel - 0.25);
            const img = elements.diagramPreview.querySelector('img');
            if (img) img.style.transform = `scale(${state.zoomLevel})`;
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                generateUML();
            }
        });
    }

    // ============================================
    // Initialization
    // ============================================

    function init() {
        // Cache DOM elements
        elements.apiKey = document.getElementById('apiKey');
        elements.toggleApiKey = document.getElementById('toggleApiKey');
        elements.diagramTypes = document.getElementById('diagramTypes');
        elements.nlInput = document.getElementById('nlInput');
        elements.charCount = document.getElementById('charCount');
        elements.generateBtn = document.getElementById('generateBtn');
        elements.codeOutput = document.getElementById('codeOutput');
        elements.diagramPreview = document.getElementById('diagramPreview');
        elements.copyBtn = document.getElementById('copyBtn');
        elements.downloadPumlBtn = document.getElementById('downloadPumlBtn');
        elements.downloadSvgBtn = document.getElementById('downloadSvgBtn');
        elements.downloadPngBtn = document.getElementById('downloadPngBtn');
        elements.downloadMdjBtn = document.getElementById('downloadMdjBtn');
        elements.zoomInBtn = document.getElementById('zoomInBtn');
        elements.zoomOutBtn = document.getElementById('zoomOutBtn');
        elements.loadingOverlay = document.getElementById('loadingOverlay');
        elements.toast = document.getElementById('toast');
        elements.validationMessages = document.getElementById('validationMessages');
        elements.validationList = document.getElementById('validationList');

        // New elements
        elements.themeToggle = document.getElementById('themeToggle');
        elements.shortcutHintBtn = document.getElementById('shortcutHintBtn');
        elements.examplesBtn = document.getElementById('examplesBtn');
        elements.examplesDropdown = document.getElementById('examplesDropdown');
        elements.historyToggleBtn = document.getElementById('historyToggleBtn');
        elements.historyPanel = document.getElementById('historyPanel');
        elements.historyPanelClose = document.getElementById('historyPanelClose');
        elements.historyList = document.getElementById('historyList');
        elements.historyClearBtn = document.getElementById('historyClearBtn');
        elements.panelOverlay = document.getElementById('panelOverlay');
        elements.fullscreenBtn = document.getElementById('fullscreenBtn');
        elements.fullscreenModal = document.getElementById('fullscreenModal');
        elements.fullscreenContainer = document.getElementById('fullscreenContainer');
        elements.fullscreenClose = document.getElementById('fullscreenClose');
        elements.fullscreenZoomIn = document.getElementById('fullscreenZoomIn');
        elements.fullscreenZoomOut = document.getElementById('fullscreenZoomOut');

        // Check for environment-injected API key (from Netlify env vars)
        const envApiKey = window.UMLAI_CONFIG?.GEMINI_API_KEY;
        if (envApiKey && envApiKey !== '' && envApiKey !== '__GEMINI_API_KEY__') {
            state.apiKey = envApiKey;
            // Hide the API key input section since it's pre-configured
            const apiKeySection = document.querySelector('.api-key-section');
            if (apiKeySection) {
                apiKeySection.style.display = 'none';
            }
            console.log('Using pre-configured API key');
        } else {
            // Load saved API key from localStorage
            const savedKey = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
            if (savedKey) {
                state.apiKey = savedKey;
                elements.apiKey.value = savedKey;
            }
        }

        // Load saved layout settings
        const savedLayout = localStorage.getItem(CONFIG.LAYOUT_STORAGE_KEY);
        if (savedLayout) {
            try {
                state.layoutSettings = { ...state.layoutSettings, ...JSON.parse(savedLayout) };
            } catch (e) { }
        }

        // Load saved theme
        const savedTheme = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
        if (savedTheme === 'light') {
            state.isLightTheme = true;
            document.documentElement.classList.add('light');
        }

        setupEventListeners();
        createLayoutControls();
        initNewFeatures();

        console.log('UML AI Generator initialized');
    }

    // ============================================
    // New Features Initialization
    // ============================================

    function initNewFeatures() {
        // Theme toggle
        if (elements.themeToggle) {
            elements.themeToggle.addEventListener('click', toggleTheme);
        }

        // Keyboard shortcuts
        if (elements.shortcutHintBtn && window.KeyboardShortcuts) {
            elements.shortcutHintBtn.addEventListener('click', () => {
                window.KeyboardShortcuts.showShortcutsModal();
            });

            // Register shortcut handlers
            window.KeyboardShortcuts.initShortcuts();
            window.KeyboardShortcuts.registerHandler('generate', generateUML);
            window.KeyboardShortcuts.registerHandler('copy', () => elements.copyBtn?.click());
            window.KeyboardShortcuts.registerHandler('downloadSvg', () => elements.downloadSvgBtn?.click());
            window.KeyboardShortcuts.registerHandler('downloadPng', () => elements.downloadPngBtn?.click());
            window.KeyboardShortcuts.registerHandler('downloadPuml', () => elements.downloadPumlBtn?.click());
            window.KeyboardShortcuts.registerHandler('closeModal', closeAllModals);
            window.KeyboardShortcuts.registerHandler('fullscreen', toggleFullscreen);
            window.KeyboardShortcuts.registerHandler('showShortcuts', () => {
                window.KeyboardShortcuts.showShortcutsModal();
            });
            window.KeyboardShortcuts.registerHandler('restoreLast', restoreLastFromHistory);
        }

        // Examples dropdown
        if (elements.examplesBtn && window.ExampleTemplates) {
            initExamplesDropdown();
        }

        // History panel
        if (elements.historyToggleBtn && window.HistoryManager) {
            initHistoryPanel();
        }

        // Fullscreen preview
        if (elements.fullscreenBtn) {
            initFullscreenPreview();
        }
    }

    function toggleTheme() {
        state.isLightTheme = !state.isLightTheme;
        document.documentElement.classList.toggle('light', state.isLightTheme);
        localStorage.setItem(CONFIG.THEME_STORAGE_KEY, state.isLightTheme ? 'light' : 'dark');
    }

    function closeAllModals() {
        // Close shortcuts modal
        if (window.KeyboardShortcuts) {
            window.KeyboardShortcuts.hideShortcutsModal();
        }

        // Close fullscreen
        if (elements.fullscreenModal?.classList.contains('show')) {
            elements.fullscreenModal.classList.remove('show');
        }

        // Close history panel
        closeHistoryPanel();

        // Close examples dropdown
        if (elements.examplesDropdown?.classList.contains('show')) {
            elements.examplesDropdown.classList.remove('show');
            elements.examplesBtn?.classList.remove('open');
        }
    }

    // Examples Dropdown
    function initExamplesDropdown() {
        const examples = window.ExampleTemplates.getAllExamples();
        const icons = {
            class: '📦', sequence: '🔄', state: '🎯', activity: '⚡',
            component: '🧩', deployment: '🖥️', package: '📁', er: '🗄️'
        };

        let currentType = '';
        let html = '';

        examples.forEach(ex => {
            if (ex.type !== currentType) {
                currentType = ex.type;
                html += `<div class="example-category">${currentType.toUpperCase()} DIAGRAMS</div>`;
            }
            html += `
                <div class="example-item" data-type="${ex.type}" data-prompt="${encodeURIComponent(ex.prompt)}">
                    <span class="icon">${icons[ex.type] || '📊'}</span>
                    <span class="title">${ex.title}</span>
                </div>
            `;
        });

        elements.examplesDropdown.innerHTML = html;

        // Toggle dropdown
        elements.examplesBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = elements.examplesDropdown.classList.toggle('show');
            elements.examplesBtn.classList.toggle('open', isOpen);
        });

        // Handle example click
        elements.examplesDropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.example-item');
            if (item) {
                const type = item.dataset.type;
                const prompt = decodeURIComponent(item.dataset.prompt);

                // Update diagram type
                state.selectedDiagramType = type;
                elements.diagramTypes.querySelectorAll('.diagram-type-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.type === type);
                });

                // Set prompt
                elements.nlInput.value = prompt;
                elements.nlInput.dispatchEvent(new Event('input'));

                // Close dropdown
                elements.examplesDropdown.classList.remove('show');
                elements.examplesBtn.classList.remove('open');

                showToast('Example loaded! Click Generate to create diagram.', 'success');
            }
        });

        // Close on outside click
        document.addEventListener('click', () => {
            elements.examplesDropdown.classList.remove('show');
            elements.examplesBtn.classList.remove('open');
        });
    }

    // History Panel
    function initHistoryPanel() {
        elements.historyToggleBtn.addEventListener('click', openHistoryPanel);
        elements.historyPanelClose.addEventListener('click', closeHistoryPanel);
        elements.panelOverlay.addEventListener('click', closeHistoryPanel);
        elements.historyClearBtn.addEventListener('click', () => {
            if (confirm('Clear all diagram history?')) {
                window.HistoryManager.clearHistory();
                showToast('History cleared', 'success');
            }
        });

        // Listen for history updates
        window.addEventListener('historyUpdated', updateHistoryPanel);

        // Initial render
        updateHistoryPanel();
    }

    function openHistoryPanel() {
        elements.historyPanel.classList.add('open');
        elements.panelOverlay.classList.add('show');
    }

    function closeHistoryPanel() {
        elements.historyPanel.classList.remove('open');
        elements.panelOverlay.classList.remove('show');
    }

    function updateHistoryPanel() {
        const history = window.HistoryManager.getHistory();

        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="history-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>No diagrams yet</p>
                    <p>Generated diagrams will appear here</p>
                </div>
            `;
            return;
        }

        elements.historyList.innerHTML = history.map(item => `
            <div class="history-item" data-id="${item.id}">
                <span class="history-item-icon">${window.HistoryManager.getDiagramIcon(item.diagramType)}</span>
                <div class="history-item-content">
                    <div class="history-item-preview">${item.inputPreview}</div>
                    <div class="history-item-meta">${item.diagramType} • ${window.HistoryManager.formatTimestamp(item.timestamp)}</div>
                </div>
                <button class="history-item-delete" data-id="${item.id}" title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Handle item click
        elements.historyList.querySelectorAll('.history-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.history-item-delete')) return;
                restoreFromHistory(el.dataset.id);
            });
        });

        // Handle delete
        elements.historyList.querySelectorAll('.history-item-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.HistoryManager.deleteHistoryItem(btn.dataset.id);
                showToast('Diagram removed from history', 'success');
            });
        });
    }

    function restoreFromHistory(id) {
        const item = window.HistoryManager.getHistoryItem(id);
        if (!item) return;

        // Restore state
        state.selectedDiagramType = item.diagramType;
        state.currentIR = item.ir;
        state.currentPlantUML = item.plantUML;
        state.currentMDJ = item.mdj;

        // Update UI
        elements.nlInput.value = item.input;
        elements.nlInput.dispatchEvent(new Event('input'));
        elements.diagramTypes.querySelectorAll('.diagram-type-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === item.diagramType);
        });
        updateCodeOutput(item.plantUML);
        renderDiagram(item.plantUML);

        closeHistoryPanel();
        showToast('Diagram restored from history', 'success');
    }

    function restoreLastFromHistory() {
        const history = window.HistoryManager?.getHistory();
        if (history && history.length > 0) {
            restoreFromHistory(history[0].id);
        }
    }

    // Fullscreen Preview
    function initFullscreenPreview() {
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        elements.fullscreenClose.addEventListener('click', closeFullscreen);
        elements.fullscreenModal.addEventListener('click', (e) => {
            if (e.target === elements.fullscreenModal) closeFullscreen();
        });

        elements.fullscreenZoomIn.addEventListener('click', () => {
            state.fullscreenZoom = Math.min(4, state.fullscreenZoom + 0.25);
            updateFullscreenZoom();
        });

        elements.fullscreenZoomOut.addEventListener('click', () => {
            state.fullscreenZoom = Math.max(0.25, state.fullscreenZoom - 0.25);
            updateFullscreenZoom();
        });
    }

    function toggleFullscreen() {
        if (elements.fullscreenModal.classList.contains('show')) {
            closeFullscreen();
        } else {
            openFullscreen();
        }
    }

    function openFullscreen() {
        const img = elements.diagramPreview.querySelector('img');
        if (!img) {
            showToast('Generate a diagram first', 'error');
            return;
        }

        state.fullscreenZoom = 1;
        elements.fullscreenContainer.innerHTML = `<img src="${img.src}" alt="UML Diagram">`;
        elements.fullscreenModal.classList.add('show');
        updateFullscreenZoom();
    }

    function closeFullscreen() {
        elements.fullscreenModal.classList.remove('show');
    }

    function updateFullscreenZoom() {
        const img = elements.fullscreenContainer.querySelector('img');
        if (img) {
            img.style.transform = `scale(${state.fullscreenZoom})`;
        }
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
