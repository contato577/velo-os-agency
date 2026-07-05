// Templates operacionais — usados quando uma venda é fechada.
// O sistema pergunta quais serviços foram vendidos e monta a estrutura automaticamente.

export interface ServiceTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  defaultDeadlineDays: number;
  checklist: string[];
  tasks: { title: string; dueOffsetDays: number; priority: "media" | "alta" | "urgente" }[];
  stages: string[];
}

export const serviceTemplates: ServiceTemplate[] = [
  {
    id: "st-trafego",
    name: "Gestão de Tráfego",
    icon: "megaphone",
    color: "primary",
    defaultDeadlineDays: 15,
    stages: ["Briefing", "Estruturação de contas", "Criativos", "Publicação", "Otimização"],
    checklist: [
      "Coletar acessos Meta Ads e Google Ads",
      "Estruturar conta e conversões",
      "Instalar pixel e tags",
      "Definir públicos-alvo e verba",
      "Criar campanhas iniciais",
      "Configurar relatório semanal",
    ],
    tasks: [
      { title: "Solicitar acessos ao cliente", dueOffsetDays: 1, priority: "alta" },
      { title: "Reunião de kickoff", dueOffsetDays: 3, priority: "alta" },
      { title: "Publicar primeiras campanhas", dueOffsetDays: 10, priority: "alta" },
      { title: "Primeiro relatório de performance", dueOffsetDays: 30, priority: "media" },
    ],
  },
  {
    id: "st-lp",
    name: "Landing Page",
    icon: "layout",
    color: "info",
    defaultDeadlineDays: 20,
    stages: ["Briefing", "Copy", "Design", "Desenvolvimento", "Publicação"],
    checklist: [
      "Briefing e objetivo da LP",
      "Definição de copy e headline",
      "Wireframe e design",
      "Desenvolvimento e responsividade",
      "Integração com pixel e CRM",
      "Publicação e testes",
    ],
    tasks: [
      { title: "Enviar formulário de briefing", dueOffsetDays: 1, priority: "alta" },
      { title: "Aprovar copy final", dueOffsetDays: 7, priority: "alta" },
      { title: "Entregar LP publicada", dueOffsetDays: 20, priority: "urgente" },
    ],
  },
  {
    id: "st-site",
    name: "Site Institucional",
    icon: "globe",
    color: "warning",
    defaultDeadlineDays: 45,
    stages: ["Briefing", "Arquitetura", "Design", "Desenvolvimento", "Publicação"],
    checklist: [
      "Briefing e mapa do site",
      "Coleta de conteúdo e imagens",
      "Design das telas",
      "Desenvolvimento e SEO",
      "Testes e homologação",
      "Publicação e treinamento",
    ],
    tasks: [
      { title: "Coletar conteúdo do cliente", dueOffsetDays: 3, priority: "alta" },
      { title: "Apresentar layout inicial", dueOffsetDays: 14, priority: "alta" },
      { title: "Publicar site em produção", dueOffsetDays: 45, priority: "urgente" },
    ],
  },
  {
    id: "st-consultoria",
    name: "Consultoria Estratégica",
    icon: "brain",
    color: "success",
    defaultDeadlineDays: 30,
    stages: ["Diagnóstico", "Estratégia", "Plano de ação", "Acompanhamento"],
    checklist: [
      "Reunião de diagnóstico",
      "Análise de dados e histórico",
      "Documento de estratégia",
      "Plano de ação com prazos",
      "Reunião mensal de acompanhamento",
    ],
    tasks: [
      { title: "Agendar diagnóstico inicial", dueOffsetDays: 2, priority: "alta" },
      { title: "Entregar plano estratégico", dueOffsetDays: 14, priority: "alta" },
      { title: "Reunião de acompanhamento", dueOffsetDays: 30, priority: "media" },
    ],
  },
];
