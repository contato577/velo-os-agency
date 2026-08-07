// Geração de relatório de cliente + tipos de integração de anúncios.
// Estrutura pronta para receber dados reais de Meta Ads e Google Ads no futuro.

import type { Client, Project } from "./mock-data";

export interface IntegracaoAds {
  fonte: "meta" | "google-ads" | "ga4" | "gsc" | "landing";
  conectado: boolean;
  investimento?: number;
  impressoes?: number;
  cliques?: number;
  ctr?: number;
  cpl?: number;
  roas?: number;
  conversoes?: number;
}

export interface RelatorioCliente {
  cliente: string;
  periodo: string;
  resumo: string;
  proximosPassos: string[];
  entregas: string[];
  integracoes: IntegracaoAds[];
}

// Nome do mês atual, em português — antes vinha travado em "julho de 2026" sempre.
function periodoAtual(): string {
  return new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

// Classificação simples de sentimento — usada pra dar um resumo objetivo
// ("indo bem" / "precisa de atenção") sem inventar número nenhum:
// olha só prazo estourado e progresso médio dos projetos ativos.
export function classificarSentimento(projetos: Project[]): { status: "bom" | "atencao"; motivo: string } {
  const ativos = projetos.filter((p) => p.status !== "entregue");
  if (ativos.length === 0) return { status: "bom", motivo: "Nenhum projeto em aberto no momento." };
  const hoje = new Date();
  const atrasados = ativos.filter((p) => new Date(p.deadline) < hoje);
  if (atrasados.length > 0) {
    return { status: "atencao", motivo: `${atrasados.length} projeto${atrasados.length === 1 ? "" : "s"} com prazo estourado.` };
  }
  const progressoMedio = ativos.reduce((s, p) => s + p.progress, 0) / ativos.length;
  if (progressoMedio < 30) {
    return { status: "atencao", motivo: "Progresso ainda baixo nos projetos ativos — vale reforçar o ritmo." };
  }
  return { status: "bom", motivo: "Projetos dentro do prazo, progresso saudável." };
}

export function gerarResumoCliente(
  client: Client,
  projetos: Project[],
  periodo = periodoAtual(),
): RelatorioCliente {
  const projetosAtivos = projetos.filter((p) => p.status !== "entregue");
  const entregas = projetos
    .filter((p) => p.status === "entregue" || p.progress >= 80)
    .map((p) => p.name);

  const proximosPassos = projetosAtivos.map((p) =>
    `Avançar ${p.name} (${p.progress}% concluído — prazo ${new Date(p.deadline).toLocaleDateString("pt-BR")})`,
  );

  const resumo =
    `Olá ${client.name},\n\n` +
    `Este é o resumo da sua operação em ${periodo}. ` +
    `${projetosAtivos.length > 0
      ? `Estamos com ${projetosAtivos.length} ${projetosAtivos.length === 1 ? "projeto" : "projetos"} em andamento`
      : "Todos os projetos do período foram concluídos"}` +
    `${entregas.length > 0 ? ` e já entregamos ${entregas.length} ${entregas.length === 1 ? "iniciativa" : "iniciativas"} importantes` : ""}. ` +
    `\n\nSua mensalidade atual é de R$ ${client.monthlyValue.toLocaleString("pt-BR")} e o próximo pagamento vence no dia ${client.paymentDay}. ` +
    `\n\nOs próximos passos combinados são:\n${proximosPassos.map((p) => `• ${p}`).join("\n")}\n\n` +
    `Qualquer dúvida, é só responder por aqui.`;

  return {
    cliente: client.company,
    periodo,
    resumo,
    proximosPassos,
    entregas,
    integracoes: [
      { fonte: "meta", conectado: false },
      { fonte: "google-ads", conectado: false },
      { fonte: "ga4", conectado: false },
      { fonte: "gsc", conectado: false },
      { fonte: "landing", conectado: false },
    ],
  };
}

export async function exportarRelatorioPDF(rel: RelatorioCliente) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  let y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Relatório de operação", margin, y);
  y += 26;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(rel.cliente, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Período: ${rel.periodo}`, margin, y);
  doc.setTextColor(0);
  y += 24;

  doc.setFontSize(11);
  const lines = doc.splitTextToSize(rel.resumo, 500);
  doc.text(lines, margin, y);
  y += lines.length * 14 + 16;

  if (rel.entregas.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Entregas do período", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    rel.entregas.forEach((e) => {
      doc.text(`• ${e}`, margin, y);
      y += 14;
    });
    y += 8;
  }

  if (rel.proximosPassos.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Próximos passos", margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    rel.proximosPassos.forEach((p) => {
      const pl = doc.splitTextToSize(`• ${p}`, 500);
      doc.text(pl, margin, y);
      y += pl.length * 14;
    });
  }

  doc.save(`Relatorio-${rel.cliente.replace(/\s+/g, "-")}-${rel.periodo.replace(/\s+/g, "-")}.pdf`);
}

export function linkWhatsApp(rel: RelatorioCliente, phone?: string) {
  const cleanPhone = (phone ?? "").replace(/\D/g, "");
  const texto = encodeURIComponent(rel.resumo);
  return `https://wa.me/${cleanPhone}?text=${texto}`;
}
