import React, { useState } from 'react';
import { X, Map, Info, Code, Layout, FileText, CheckCircle, Settings, Monitor, Grid } from 'lucide-react';

// --- TIPO DE DADOS PARA TELAS ---
interface ScreenHotspot {
    id: string; // Link to systemNodes
    label: string;
    x: number; // % left
    y: number; // % top
    w: number; // % width
    h: number; // % height
}

interface ScreenDef {
    id: string;
    name: string;
    description: string;
    hotspots: ScreenHotspot[];
    // Vamos desenhar o esqueleto (Wireframe) com CSS na hora de renderizar
    type: 'dashboard' | 'editor';
}

const screens: ScreenDef[] = [
    {
        id: 'dashboard',
        name: 'Tela Principal (Fábrica)',
        description: 'Onde você vê a lista de peças e o resumo do orçamento.',
        type: 'dashboard',
        hotspots: [
            { id: 'root', label: 'QuoteBuilder (O Chefe)', x: 0, y: 0, w: 100, h: 100 },
            { id: 'list', label: 'Lista de Peças (Cards)', x: 5, y: 25, w: 90, h: 60 },
            { id: 'brain', label: 'Botão Importar IA', x: 80, y: 5, w: 15, h: 8 },
        ]
    },
    {
        id: 'editor',
        name: 'Tela de Edição (Modal)',
        description: 'Onde você desenha e configura uma viga ou pilar.',
        type: 'editor',
        hotspots: [
            { id: 'editor', label: 'Editor Completo', x: 0, y: 0, w: 100, h: 100 },
            { id: 'beam_view', label: 'Vista Longitudinal (Desenho)', x: 5, y: 20, w: 70, h: 40 },
            { id: 'col_view', label: 'Vista Pilar (Alternativa)', x: 5, y: 20, w: 70, h: 40 },
            { id: 'section_view', label: 'Seletor de Seção (Bolinhas)', x: 78, y: 20, w: 17, h: 20 },
            { id: 'detached_stirrup', label: 'Estribo Avulso (Detalhe)', x: 30, y: 65, w: 40, h: 20 },
            { id: 'main_bars', label: 'Lista de Ferros (Dados)', x: 5, y: 65, w: 20, h: 30 },
        ]
    }
];

// --- DADOS DO ORGANOGRAMA (Mantidos) ---
interface SystemNode {
    id: string;
    label: string;
    technicalName: string;
    path: string;
    purpose: string;
    status: 'stable' | 'beta' | 'wip';
    inputs: string[];
    features: string[];
    type: 'manager' | 'ui' | 'service' | 'container' | 'drawing' | 'interaction' | 'data' | 'detail';
    children: string[];
}

const systemNodes: SystemNode[] = [
    {
        id: 'root',
        label: 'Fábrica de Orçamentos',
        technicalName: 'QuoteBuilder',
        path: 'components/QuoteBuilder.tsx',
        purpose: 'O componente principal. Gerencia todo o estado do orçamento, a lista de itens e abre as ferramentas de edição.',
        status: 'stable',
        inputs: ['client (Dados do Cliente)', 'onSave (Função de Salvar)'],
        features: ['Gerencia Lista de Itens', 'Calcula Peso Total', 'Integração IA', 'Controle de Modais'],
        type: 'manager',
        children: ['list', 'editor', 'brain']
    },
    {
        id: 'list',
        label: 'Lista de Peças (Cartões)',
        technicalName: 'QuoteTable (Map)',
        path: 'QuoteBuilder.tsx (~Line 2800)',
        purpose: 'Exibir todos os itens já criados (Vigas, Pilares, Sapatas) em formato de cartões visuais.',
        status: 'stable',
        inputs: ['items'],
        features: ['Cards Visuais', 'Status de Erro', 'Botões de Edição'],
        type: 'ui',
        children: []
    },
    {
        id: 'brain',
        label: 'Cérebro IA',
        technicalName: 'analyzeImageWithGemini',
        path: 'services/imageAnalysisService.ts',
        purpose: 'Ler imagens/prints de projetos e transformar magicamente em dados estruturados.',
        status: 'beta',
        inputs: ['File', 'API Key'],
        features: ['OCR (Texto)', 'Geometria', 'Quantitativos'],
        type: 'service',
        children: []
    },
    {
        id: 'editor',
        label: 'Prancheta de Edição (Modal)',
        technicalName: 'ItemReinforcementPreview',
        path: 'QuoteBuilder.tsx (Modal)',
        purpose: 'O ambiente onde o usuário desenha e configura os detalhes de uma peça específica.',
        status: 'stable',
        inputs: ['item', 'callbacks'],
        features: ['Inputs de Medidas', 'Preview Dinâmico', 'Configuração Top/Bottom'],
        type: 'container',
        children: ['beam_view', 'col_view', 'section_view']
    },
    {
        id: 'beam_view',
        label: 'Vista Longitudinal (Viga)',
        technicalName: '<BeamElevationView />',
        path: 'QuoteBuilder.tsx (~Line 1000)',
        purpose: 'Desenho lateral da viga. Mostra barras esticadas, ganchos e posição do corte.',
        status: 'stable',
        inputs: ['item', 'onEditBar'],
        features: ['Desenho do Concreto', 'Barras Coloridas', 'Corte A-A', 'Escala Automática'],
        type: 'drawing',
        children: ['main_bars', 'detached_stirrup']
    },
    {
        id: 'col_view',
        label: 'Vista Elevação (Pilar)',
        technicalName: '<ColumnElevationView />',
        path: 'QuoteBuilder.tsx (~Line 1900)',
        purpose: 'Desenho vertical do pilar. Foca na seção transversal e estribos.',
        status: 'stable',
        inputs: ['item', 'newBar'],
        features: ['Seção Transversal', 'Barras (Bolinhas)', 'Indicação de Estribos'],
        type: 'drawing',
        children: ['main_bars_col', 'detached_stirrup']
    },
    {
        id: 'section_view',
        label: 'Seletor de Seção',
        technicalName: '<CompositeCrossSection />',
        path: 'QuoteBuilder.tsx (~Line 300)',
        purpose: 'Grade interativa para adicionar/remover barras clicando. É o "Mapa de Furação".',
        status: 'stable',
        inputs: ['stirrupW/H', 'model', 'bars'],
        features: ['Grid Magnético', 'Formas (Rect...Hex)', 'Interação Click'],
        type: 'interaction',
        children: []
    },
    {
        id: 'detached_stirrup',
        label: 'Estribo Avulso',
        technicalName: 'Detached Stirrup (Block)',
        path: 'Dentro das Views',
        purpose: 'O desenho de fabricação do estribo. Mostra todas as cotas de corte e dobras.',
        status: 'stable',
        inputs: ['model', 'width', 'height'],
        features: ['Geometria Exata', 'Cotas por Aresta', 'Ganchos Fiéis', 'Escala Fixa'],
        type: 'detail',
        children: []
    },
    {
        id: 'main_bars',
        label: 'Ferros Longitudinais',
        technicalName: 'MainBarGroup',
        path: 'types.ts',
        purpose: 'Dados das barras: quantidade, bitola, comprimento e dobras.',
        status: 'stable',
        inputs: ['count', 'gauge', 'segments'],
        features: ['Cálculo de Peso', 'Posição Top/Bottom', 'Dobras Complexas'],
        type: 'data',
        children: []
    },
    {
        id: 'main_bars_col',
        label: 'Ferros (Bolinhas)',
        technicalName: 'MainBarGroup',
        path: 'types.ts',
        purpose: 'Mesma estrutura dos ferros, mas visualizada como pontos no pilar.',
        status: 'stable',
        inputs: [],
        features: [],
        type: 'data',
        children: []
    }
];

export function DevSystemMap({ onClose }: { onClose: () => void }) {
    const [activeTab, setActiveTab] = useState<'diagram' | 'screens'>('screens');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedNode = systemNodes.find(n => n.id === selectedId);

    // --- RENDERIZADORES DE WIREFRAME (ESQUELETOS) ---
    const renderDashboardWireframe = () => (
        <div className="w-full h-full bg-slate-100 relative rounded-xl border-2 border-slate-300 overflow-hidden shadow-inner flex flex-col">
            {/* Header */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
                <div className="w-32 h-6 bg-slate-200 rounded animate-pulse"></div>
                <div className="w-24 h-8 bg-emerald-500 rounded animate-pulse"></div>
            </div>
            {/* Body */}
            <div className="flex-1 p-4 grid grid-cols-3 gap-4 overflow-hidden">
                {[1, 2, 3].map(i => (
                    <div key={i} className="bg-white h-48 rounded-2xl border border-slate-200 shadow-sm flex flex-col p-4 gap-2">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                        <div className="w-3/4 h-4 bg-slate-200 rounded"></div>
                        <div className="w-1/2 h-3 bg-slate-100 rounded"></div>
                    </div>
                ))}
            </div>
            {/* Label Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-10">
                <h1 className="text-6xl font-black text-slate-900 uppercase -rotate-12">DASHBOARD</h1>
            </div>
        </div>
    );

    const renderEditorWireframe = () => (
        <div className="w-full h-full bg-slate-900/5 backdrop-blur-sm relative rounded-xl border-2 border-slate-300 overflow-hidden shadow-inner p-8 flex items-center justify-center">
            {/* Modal Window */}
            <div className="w-[90%] h-[90%] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden relative">
                {/* Editor Header */}
                <div className="h-12 border-b border-slate-100 bg-slate-50 flex items-center px-4">
                    <div className="w-40 h-4 bg-slate-300 rounded"></div>
                </div>
                <div className="flex-1 flex">
                    {/* Inputs Column */}
                    <div className="w-1/4 border-r border-slate-100 p-4 space-y-4">
                        <div className="h-8 bg-slate-100 rounded w-full"></div>
                        <div className="h-20 bg-blue-50/50 border border-blue-100 rounded w-full"></div>
                        <div className="h-8 bg-slate-100 rounded w-full"></div>
                    </div>
                    {/* Drawing Area */}
                    <div className="flex-1 p-6 relative bg-slate-50/30">
                        {/* Beam Drawing Mockup */}
                        <div className="w-full h-32 border-2 border-slate-800 bg-white relative mb-8 rounded-sm">
                            <div className="absolute top-2 w-[90%] left-[5%] h-1 bg-blue-500"></div> {/* Top Bar */}
                            <div className="absolute bottom-2 w-[90%] left-[5%] h-1 bg-red-500"></div> {/* Bot Bar */}
                        </div>
                        {/* Stirrup Detail Mockup */}
                        <div className="w-24 h-24 border-2 border-slate-800 mx-auto rounded-sm relative">
                            <div className="absolute -top-2 -left-2 text-[8px]">M1</div>
                        </div>
                    </div>
                    {/* Right Panel */}
                    <div className="w-40 border-l border-slate-100 p-4 flex flex-col items-center gap-4">
                        <div className="w-24 h-24 border border-slate-300 rounded bg-slate-50 grid grid-cols-3 gap-1 p-1">
                            {[...Array(9)].map((_, i) => <div key={i} className="bg-slate-200 rounded-full"></div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans text-slate-800">
            <div className="bg-white w-full max-w-7xl h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 relative">

                {/* Top Bar: Tabs */}
                <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white z-20">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 text-white p-2 rounded-lg"><Layout className="w-5 h-5" /></div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Raio-X do Sistema</h2>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('screens')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'screens' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Telas Visuais
                        </button>
                        <button
                            onClick={() => setActiveTab('diagram')}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'diagram' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Organograma
                        </button>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* CONTENT AREA */}
                    <div className="flex-1 bg-slate-50/50 p-8 overflow-y-auto relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]">

                        {activeTab === 'screens' ? (
                            <div className="flex flex-col gap-16 pb-20 max-w-5xl mx-auto">
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm mb-4 flex items-center gap-3">
                                    <Info className="w-5 h-5" />
                                    <p>Passe o mouse sobre as áreas coloridas das telas para ver o <strong>Nome Técnico</strong>.</p>
                                </div>

                                {screens.map(screen => (
                                    <div key={screen.id} className="space-y-4">
                                        <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                            <Monitor className="w-6 h-6 text-slate-400" />
                                            {screen.name}
                                        </h3>
                                        <p className="text-slate-500">{screen.description}</p>

                                        {/* Interactive Screen Container */}
                                        <div className="relative w-full aspect-video bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 group">
                                            {/* The Wireframe Background */}
                                            {screen.type === 'dashboard' ? renderDashboardWireframe() : renderEditorWireframe()}

                                            {/* Hotspots Overlay */}
                                            <div className="absolute inset-0">
                                                {screen.hotspots.map(hotspot => (
                                                    <button
                                                        key={hotspot.id}
                                                        onClick={() => setSelectedId(hotspot.id)}
                                                        className={`
                                 absolute border-2 transition-all duration-200 flex items-center justify-center
                                 opacity-0 hover:opacity-100 hover:bg-blue-500/20 hover:border-blue-500
                                 ${selectedId === hotspot.id ? 'opacity-100 bg-blue-500/20 border-blue-500 z-10' : 'border-transparent z-0'}
                               `}
                                                        style={{
                                                            left: `${hotspot.x}%`,
                                                            top: `${hotspot.y}%`,
                                                            width: `${hotspot.w}%`,
                                                            height: `${hotspot.h}%`
                                                        }}
                                                    >
                                                        <span className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg translate-y-[-100%] absolute top-0">
                                                            {hotspot.label}
                                                        </span>
                                                    </button>
                                                ))}

                                                {/* Hint bubbles visible when NOT hovering */}
                                                {screen.hotspots.map(hotspot => (
                                                    <div
                                                        key={`hint-${hotspot.id}`}
                                                        className="absolute w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm pointer-events-none animate-pulse group-hover:opacity-0 transition-opacity"
                                                        style={{
                                                            left: `${hotspot.x + hotspot.w / 2}%`,
                                                            top: `${hotspot.y + hotspot.h / 2}%`,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // DIAGRAM MODE
                            <div className="flex flex-col items-center pt-10 pb-20 scale-90 origin-top">
                                {/* ... Previous recursive render code adapted slightly ... */}
                                {(() => {
                                    const renderNode = (nodeId: string) => {
                                        const node = systemNodes.find(n => n.id === nodeId);
                                        if (!node) return null;
                                        const isSelected = selectedId === nodeId;
                                        return (
                                            <div className="flex flex-col items-center">
                                                <button
                                                    onClick={() => setSelectedId(nodeId)}
                                                    className={`
                                relative px-5 py-4 rounded-2xl border-2 transition-all duration-200 shadow-md flex flex-col items-center gap-1 min-w-[180px] z-10
                                ${isSelected ? 'border-blue-500 bg-white ring-4 ring-blue-500/10 scale-105' : 'border-slate-200 bg-white hover:border-slate-300'}
                              `}
                                                >
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{node.type}</span>
                                                    <span className="text-sm font-bold text-slate-800">{node.label}</span>
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono mt-1">{node.technicalName}</span>

                                                    {/* Connector Logic Same as Before */}
                                                    {node.children.length > 0 && <div className="absolute -bottom-6 left-1/2 w-0.5 h-6 bg-slate-300 -translate-x-1/2 -z-10"></div>}
                                                </button>
                                                {node.children.length > 0 && (
                                                    <div className="mt-12 flex gap-8 items-start relative z-0">
                                                        {node.children.length > 1 && <div className="absolute top-[-24px] left-[20%] right-[20%] h-0.5 bg-slate-300"></div>}
                                                        {node.children.map(childId => (
                                                            <div key={childId} className="relative pt-6">
                                                                <div className="absolute top-[-24px] left-1/2 w-0.5 h-6 bg-slate-300 -translate-x-1/2"></div>
                                                                {renderNode(childId)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    };
                                    return renderNode('root');
                                })()}
                            </div>
                        )}
                    </div>

                    {/* SIDE PANEL (Shared) */}
                    <div className="w-[400px] bg-white border-l border-slate-200 p-0 flex flex-col shadow-2xl z-30">
                        {selectedNode ? (
                            <div className="flex-1 overflow-y-auto p-8 animate-in slide-in-from-right-10 duration-200">
                                <div className="mb-6">
                                    <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block mb-2">{selectedNode.technicalName}</span>
                                    <h3 className="text-3xl font-black text-slate-900 leading-tight mb-2">{selectedNode.label}</h3>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <FileText className="w-3 h-3" /> {selectedNode.path}
                                    </div>
                                </div>

                                <div className="prose prose-sm prose-slate mb-8">
                                    <p>{selectedNode.purpose}</p>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4 text-emerald-500" /> Funcionalidades
                                        </h4>
                                        <ul className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
                                            {selectedNode.features.map(f => <li key={f} className="text-sm text-slate-700 flex gap-2"><span>•</span> {f}</li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-amber-500" /> Dados (Inputs)
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedNode.inputs.map(inp => <span key={inp} className="text-xs font-mono bg-white border border-slate-200 px-2 py-1 rounded text-slate-500 shadow-sm">{inp}</span>)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                <Grid className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-lg font-bold text-slate-700 mb-2">Nenhum item selecionado</h3>
                                <p className="text-sm">Clique nos pontinhos piscantes nas telas ou nas caixas do organograma para ver os detalhes técnicos.</p>
                            </div>
                        )}
                        <div className="p-4 border-t border-slate-100 text-center">
                            <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                Fechar Raio-X
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

