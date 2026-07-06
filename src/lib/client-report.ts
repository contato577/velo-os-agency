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

export function gerarResumoCliente(
  client: Client,
  projetos: Project[],
  periodo = "julho de 2026",
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
