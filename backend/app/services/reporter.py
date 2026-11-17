import csv
import io
from datetime import datetime, timezone
from typing import Any, Dict, List
from fpdf import FPDF
from sqlalchemy.orm import Session
from app.schemas import ExecutiveReportResponse, FilterParams
from app.services.analyzer import fmt_brl, run_intelligent_analysis
from app.services.metrics import get_dashboard_data


DANGEROUS_CSV_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value: Any) -> Any:
    """
    Protects exported CSV files against Spreadsheet Formula Injection (CSV Injection).
    Strings starting with '=', '+', '-', '@', tab, or carriage return are prefixed with a single quote.
    """
    if isinstance(value, (int, float)):
        return value
    if value is None:
        return ""
    s = str(value)
    if s and s.startswith(DANGEROUS_CSV_PREFIXES):
        return f"'{s}"
    return s


def build_recommendations(dashboard, analysis) -> List[Dict[str, str]]:
    """Builds data-grounded commercial recommendations with clear analytical disclaimers."""
    recs: List[Dict[str, str]] = []

    for alert in analysis.alerts:
        if alert.category == "queda_produto":
            recs.append(
                {
                    "area": f"Portfólio — {alert.affected_entity}",
                    "priority": "Alta",
                    "action": (
                        f"Revisar posicionamento comercial, disponibilidade e argumentário de vendas para '{alert.affected_entity}', "
                        f"que acumulou variação de {alert.metric_value} entre períodos."
                    ),
                    "basis": alert.observed_fact,
                }
            )
        elif alert.category == "margem_baixa":
            recs.append(
                {
                    "area": f"Precificação & Custos — {alert.affected_entity}",
                    "priority": "Alta",
                    "action": (
                        f"Auditar descontos concedidos e renegociar custo unitário de '{alert.affected_entity}' "
                        f"(margem bruta atual de {alert.metric_value})."
                    ),
                    "basis": alert.observed_fact,
                }
            )
        elif alert.category == "crescimento_categoria":
            recs.append(
                {
                    "area": f"Expansão Comercial — {alert.affected_entity}",
                    "priority": "Média",
                    "action": (
                        f"Ampliar campanhas de cross-sell e priorizar geração de leads para a linha '{alert.affected_entity}' "
                        f"({alert.metric_value})."
                    ),
                    "basis": alert.observed_fact,
                }
            )
        elif alert.category == "vendedor_abaixo_media":
            recs.append(
                {
                    "area": f"Gestão de Equipe — {alert.affected_entity}",
                    "priority": "Média",
                    "action": (
                        f"Realizar diagnóstico de funil comercial e mix de produtos ofertados por '{alert.affected_entity}' "
                        f"({alert.metric_value} frente à média do time)."
                    ),
                    "basis": alert.observed_fact,
                }
            )
        elif alert.category == "concentracao":
            recs.append(
                {
                    "area": "Diversificação de Receita",
                    "priority": "Média",
                    "action": (
                        "Estruturar ofertas combinadas (bundles) conectando produtos líderes a itens complementares de alta margem."
                    ),
                    "basis": alert.observed_fact,
                }
            )

    if not recs and dashboard.has_data:
        recs.append(
            {
                "area": "Manutenção Operacional",
                "priority": "Informativa",
                "action": "Manter acompanhamento mensal de ticket médio, margem bruta e conversão regional.",
                "basis": f"Faturamento líquido consolidado de {fmt_brl(dashboard.kpis.net_revenue)} em {dashboard.kpis.total_orders} pedidos.",
            }
        )

    return recs


def generate_executive_report(db: Session, filters: FilterParams) -> ExecutiveReportResponse:
    """Generates the structured executive report respecting all active filters."""
    dashboard = get_dashboard_data(db, filters)
    analysis = run_intelligent_analysis(db, filters)
    recs = build_recommendations(dashboard, analysis)

    applied_filters = {
        "start_date": filters.start_date.isoformat() if filters.start_date else "Todo o período",
        "end_date": filters.end_date.isoformat() if filters.end_date else "Todo o período",
        "category": filters.category or "Todas",
        "product": filters.product or "Todos",
        "salesperson": filters.salesperson or "Todos",
        "region": filters.region or "Todas",
    }

    if not dashboard.has_data:
        summary_text = "Não há registros de vendas disponíveis para os filtros selecionados."
    else:
        k = dashboard.kpis
        margin_txt = (
            f"O lucro bruto estimado atingiu {fmt_brl(k.gross_profit or 0.0)} (margem de {k.profit_margin_pct:.1f}%)."
            if k.has_cost_data
            else "Métricas de lucro e margem não estão disponíveis pois o conjunto de dados não inclui custos unitários."
        )
        growth_txt = (
            f"Na comparação com o período anterior equivalente ({k.previous_period_label}), o faturamento apresentou variação de {k.revenue_growth_pct:+.1f}%."
            if k.revenue_growth_pct is not None
            else ""
        )
        demo_disclaimer = (
            " [Nota: Os dados atuais incluem registros sintéticos de demonstração. As recomendações constituem análises auxiliares de apoio à decisão e não representam garantia de resultados comerciais.]"
            if dashboard.is_demo_active
            else " [Nota: As recomendações constituem análises auxiliares baseadas nos dados históricos e não representam garantia de resultados comerciais.]"
        )
        summary_text = (
            f"No recorte analisado ({k.period_label}), a operação registrou faturamento líquido de {fmt_brl(k.net_revenue)} "
            f"(faturamento bruto de {fmt_brl(k.gross_revenue)} e {fmt_brl(k.total_discounts)} em descontos), "
            f"totalizando {k.total_orders} pedidos únicos, {k.total_items_sold:.0f} itens vendidos e ticket médio de {fmt_brl(k.average_ticket)}. "
            f"{margin_txt} {growth_txt}{demo_disclaimer}"
        )

    return ExecutiveReportResponse(
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        applied_filters=applied_filters,
        executive_summary=summary_text,
        kpis=dashboard.kpis,
        revenue_evolution=dashboard.revenue_evolution,
        top_products=dashboard.top_products,
        category_performance=dashboard.sales_by_category,
        salesperson_performance=dashboard.salesperson_performance,
        alerts=analysis.alerts,
        recommendations=recs,
    )


def export_report_csv(db: Session, filters: FilterParams) -> bytes:
    """Exports the complete filtered executive report as a formula-safe UTF-8 CSV."""
    report = generate_executive_report(db, filters)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=",", quoting=csv.QUOTE_MINIMAL)

    def write_safe_row(row_vals: List[Any]):
        writer.writerow([sanitize_csv_cell(v) for v in row_vals])

    write_safe_row(["SALESPILOT AI - RELATORIO EXECUTIVO DE VENDAS"])
    write_safe_row(["Gerado em", report.generated_at])
    write_safe_row(["Resumo Executivo", report.executive_summary])
    write_safe_row([])

    write_safe_row(["FILTROS APLICADOS"])
    for k, v in report.applied_filters.items():
        write_safe_row([k, v])
    write_safe_row([])

    kpis = report.kpis
    write_safe_row(["INDICADORES PRINCIPAIS"])
    write_safe_row(["Metrica", "Valor"])
    write_safe_row(["Faturamento Bruto", f"{kpis.gross_revenue:.2f}"])
    write_safe_row(["Descontos", f"{kpis.total_discounts:.2f}"])
    write_safe_row(["Faturamento Liquido", f"{kpis.net_revenue:.2f}"])
    write_safe_row(["Quantidade de Pedidos Unicos", kpis.total_orders])
    write_safe_row(["Quantidade de Produtos Vendidos", f"{kpis.total_items_sold:.2f}"])
    write_safe_row(["Ticket Medio", f"{kpis.average_ticket:.2f}"])
    write_safe_row(["Lucro Bruto Estimado", f"{kpis.gross_profit:.2f}" if kpis.gross_profit is not None else "Indisponivel (sem custo)"])
    write_safe_row(["Margem de Lucro (%)", f"{kpis.profit_margin_pct:.2f}%" if kpis.profit_margin_pct is not None else "Indisponivel (sem custo)"])
    write_safe_row(["Crescimento vs Periodo Anterior (%)", f"{kpis.revenue_growth_pct:.2f}%" if kpis.revenue_growth_pct is not None else "N/D"])
    write_safe_row([])

    write_safe_row(["DESEMPENHO POR PRODUTO"])
    write_safe_row(["Produto", "Categoria", "Unidades", "Pedidos", "Faturamento Liquido", "Margem (%)", "Share (%)", "Variacao (%)"])
    for p in report.top_products:
        write_safe_row([
            p.product,
            p.category,
            p.items_sold,
            p.orders,
            f"{p.net_revenue:.2f}",
            f"{p.margin_pct:.2f}%" if p.margin_pct is not None else "N/D",
            f"{p.share_pct:.2f}%",
            f"{p.growth_pct:.2f}%" if p.growth_pct is not None else "N/D",
        ])
    write_safe_row([])

    write_safe_row(["DESEMPENHO POR CATEGORIA"])
    write_safe_row(["Categoria", "Faturamento Liquido", "Pedidos", "Unidades", "Share (%)", "Variacao (%)"])
    for c in report.category_performance:
        write_safe_row([
            c.category,
            f"{c.net_revenue:.2f}",
            c.orders,
            c.items_sold,
            f"{c.share_pct:.2f}%",
            f"{c.growth_pct:.2f}%" if c.growth_pct is not None else "N/D",
        ])
    write_safe_row([])

    write_safe_row(["DESEMPENHO POR VENDEDOR"])
    write_safe_row(["Vendedor", "Regiao", "Faturamento Liquido", "Pedidos", "Ticket Medio", "vs Media Equipe (%)"])
    for s in report.salesperson_performance:
        write_safe_row([
            s.salesperson,
            s.region,
            f"{s.net_revenue:.2f}",
            s.orders,
            f"{s.average_ticket:.2f}",
            f"{s.vs_team_avg_pct:.2f}%",
        ])
    write_safe_row([])

    write_safe_row(["ALERTAS IDENTIFICADOS"])
    write_safe_row(["Titulo", "Severidade", "Indicador", "Fato Observado", "Hipotese para Investigacao"])
    for a in report.alerts:
        write_safe_row([a.title, a.severity, f"{a.metric_label}: {a.metric_value}", a.observed_fact, a.investigation_hypothesis])

    return output.getvalue().encode("utf-8-sig")


def _pdf_safe_text(text: str) -> str:
    """Normalizes text to latin-1 compatible characters for standard FPDF Helvetica rendering."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def export_report_pdf(db: Session, filters: FilterParams) -> bytes:
    """Generates a multi-section executive PDF report respecting all active filters."""
    from fpdf.enums import XPos, YPos

    report = generate_executive_report(db, filters)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    epw = pdf.epw

    def write_line(text: str, h: float = 5.5, bold: bool = False, size: int = 9):
        pdf.set_x(pdf.l_margin)
        pdf.set_font("Helvetica", "B" if bold else "", size)
        pdf.multi_cell(w=epw, h=h, text=_pdf_safe_text(text), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # Header
    pdf.set_fill_color(10, 15, 30)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_x(pdf.l_margin)
    pdf.cell(
        w=epw,
        h=12,
        text=_pdf_safe_text("  SalesPilot AI - Relatório Executivo de Vendas"),
        fill=True,
        new_x=XPos.LMARGIN,
        new_y=YPos.NEXT,
    )
    pdf.ln(3)

    pdf.set_text_color(60, 70, 90)
    filters_line = (
        f"Gerado em: {report.generated_at} | Período: {report.applied_filters['start_date']} a {report.applied_filters['end_date']} | "
        f"Categoria: {report.applied_filters['category']} | Vendedor: {report.applied_filters['salesperson']} | Região: {report.applied_filters['region']}"
    )
    write_line(filters_line, h=5, bold=False, size=9)
    pdf.ln(3)

    # 1. Resumo Executivo
    pdf.set_text_color(15, 23, 42)
    write_line("1. Resumo Executivo", h=7, bold=True, size=12)
    pdf.set_text_color(40, 50, 70)
    write_line(report.executive_summary, h=5, bold=False, size=10)
    pdf.ln(3)

    # 2. Indicadores Principais
    k = report.kpis
    pdf.set_text_color(15, 23, 42)
    write_line("2. Indicadores Principais", h=7, bold=True, size=12)
    pdf.set_text_color(40, 50, 70)
    kpi_lines = [
        f"Faturamento Bruto: {fmt_brl(k.gross_revenue)} | Descontos: {fmt_brl(k.total_discounts)} | Faturamento Líquido: {fmt_brl(k.net_revenue)}",
        f"Pedidos Únicos: {k.total_orders} | Produtos Vendidos: {k.total_items_sold:.0f} | Ticket Médio: {fmt_brl(k.average_ticket)}",
        (
            f"Lucro Bruto Estimado: {fmt_brl(k.gross_profit or 0.0)} | Margem Bruta: {k.profit_margin_pct:.1f}%"
            if k.has_cost_data
            else "Lucro Bruto e Margem: Indisponíveis (conjunto de dados sem custo unitário)"
        ),
        (
            f"Variação vs. Período Anterior ({k.previous_period_label}): {k.revenue_growth_pct:+.1f}%"
            if k.revenue_growth_pct is not None
            else "Variação vs. Período Anterior: Sem período anterior equivalente"
        ),
    ]
    for line in kpi_lines:
        write_line(f"- {line}", h=5.5, bold=False, size=10)
    pdf.ln(3)

    # 3. Desempenho por Produto
    pdf.set_text_color(15, 23, 42)
    write_line("3. Desempenho por Produto (Top Produtos)", h=7, bold=True, size=12)
    pdf.set_text_color(40, 50, 70)
    for p in report.top_products[:8]:
        m_str = f" | Margem: {p.margin_pct:.1f}%" if p.margin_pct is not None else ""
        g_str = f" | Var: {p.growth_pct:+.1f}%" if p.growth_pct is not None else ""
        line = f"{p.product} ({p.category}): {fmt_brl(p.net_revenue)} ({p.share_pct:.1f}%), {p.items_sold:.0f} un.{m_str}{g_str}"
        write_line(f"- {line}", h=5, bold=False, size=9)
    pdf.ln(3)

    # 4. Desempenho por Categoria & Vendedor
    pdf.set_text_color(15, 23, 42)
    write_line("4. Desempenho por Categoria e Vendedor", h=7, bold=True, size=12)
    write_line("Categorias:", h=6, bold=True, size=10)
    pdf.set_text_color(40, 50, 70)
    for c in report.category_performance:
        g_str = f" ({c.growth_pct:+.1f}%)" if c.growth_pct is not None else ""
        write_line(f"- {c.category}: {fmt_brl(c.net_revenue)} ({c.share_pct:.1f}% do total){g_str}", h=5, bold=False, size=9)

    pdf.ln(2)
    pdf.set_text_color(15, 23, 42)
    write_line("Vendedores:", h=6, bold=True, size=10)
    pdf.set_text_color(40, 50, 70)
    for s in report.salesperson_performance:
        write_line(
            f"- {s.salesperson} ({s.region}): {fmt_brl(s.net_revenue)} | {s.orders} pedidos | Ticket: {fmt_brl(s.average_ticket)} ({s.vs_team_avg_pct:+.1f}% vs. média)",
            h=5,
            bold=False,
            size=9,
        )
    pdf.ln(3)

    # 5. Alertas e Recomendações
    pdf.set_text_color(15, 23, 42)
    write_line("5. Alertas Identificados e Recomendações", h=7, bold=True, size=12)
    pdf.set_text_color(40, 50, 70)
    for a in report.alerts[:6]:
        write_line(
            f"[{a.severity.upper()}] {a.title} ({a.metric_value}): {a.observed_fact} Hipótese: {a.investigation_hypothesis}",
            h=5,
            bold=False,
            size=9,
        )
        pdf.ln(1)

    if report.recommendations:
        pdf.ln(2)
        pdf.set_text_color(15, 23, 42)
        write_line("Recomendações Baseadas nos Dados:", h=6, bold=True, size=10)
        pdf.set_text_color(40, 50, 70)
        for r in report.recommendations[:5]:
            write_line(f"- [{r['priority']}] {r['area']}: {r['action']}", h=5, bold=False, size=9)

    return bytes(pdf.output())
