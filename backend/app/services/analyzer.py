from typing import List
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from app.schemas import AnalysisResponse, FilterParams, SmartAlert
from app.services.metrics import (
    build_category_breakdown,
    build_product_performance,
    build_revenue_evolution,
    build_salesperson_performance,
    enrich_financial_columns,
    fetch_records_df,
    split_current_and_previous_df,
)


def fmt_brl(val: float) -> str:
    """Formats float as Brazilian currency string (e.g., R$ 12.345,67)."""
    s = f"{val:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"R$ {s}"


def run_intelligent_analysis(db: Session, filters: FilterParams) -> AnalysisResponse:
    """
    Executes statistical and rule-based diagnostics on commercial records.
    Clearly separates:
    - observed_fact (Fato observado nos dados)
    - statistical_justification (Justificativa matemática/estatística)
    - possible_explanation (Possível explicação comercial)
    - investigation_hypothesis (Hipótese que precisa de investigação)
    """
    entity_df = fetch_records_df(db, filters, apply_date_filter=False)
    if entity_df.empty:
        return AnalysisResponse(
            has_data=False,
            summary={"total_alerts": 0, "high_severity": 0, "medium_severity": 0, "positive_highlights": 0},
            alerts=[],
            concentration_top3_pct=0.0,
            concentration_top5_pct=0.0,
            team_average_revenue=0.0,
        )

    cur_df, prev_df, p_label, prev_label = split_current_and_previous_df(
        entity_df,
        start_date=filters.start_date,
        end_date=filters.end_date,
    )

    if cur_df.empty:
        return AnalysisResponse(
            has_data=False,
            summary={"total_alerts": 0, "high_severity": 0, "medium_severity": 0, "positive_highlights": 0},
            alerts=[],
            concentration_top3_pct=0.0,
            concentration_top5_pct=0.0,
            team_average_revenue=0.0,
        )

    comp_cur_df = cur_df
    if not filters.start_date and not filters.end_date and not entity_df.empty:
        min_ts = entity_df["sale_date"].min()
        max_ts = entity_df["sale_date"].max()
        total_days = max((max_ts - min_ts).days + 1, 1)
        if total_days >= 14:
            half_days = total_days // 2
            mid_point = max_ts - pd.Timedelta(days=half_days - 1)
            comp_cur_df = entity_df[(entity_df["sale_date"] >= mid_point) & (entity_df["sale_date"] <= max_ts)]

    products = build_product_performance(cur_df, comp_cur_df, prev_df)
    categories = build_category_breakdown(cur_df, comp_cur_df, prev_df)
    salespeople = build_salesperson_performance(cur_df, comp_cur_df, prev_df)
    evolution = build_revenue_evolution(cur_df)

    alerts: List[SmartAlert] = []

    # 1. Produtos com queda de vendas (threshold: <= -15%)
    for prod in products:
        if prod.growth_pct is not None and prod.growth_pct <= -15.0:
            alerts.append(
                SmartAlert(
                    id=f"drop_prod_{prod.product}",
                    title=f"Queda expressiva nas vendas: {prod.product}",
                    category="queda_produto",
                    severity="alta" if prod.growth_pct <= -30.0 else "media",
                    metric_label="Variação no Período",
                    metric_value=f"{prod.growth_pct:+.1f}%",
                    observed_fact=(
                        f"O faturamento líquido de '{prod.product}' recuou { abs(prod.growth_pct):.1f}% na comparação entre "
                        f"o período recente ({p_label}) e o período anterior equivalente ({prev_label})."
                    ),
                    statistical_justification=(
                        f"Regra de variação interperíodos: redução superior ao limite de alerta de -15% "
                        f"(faturamento anterior de {fmt_brl(prod.previous_net_revenue or 0.0)} na janela comparativa)."
                    ),
                    possible_explanation=(
                        "Pode refletir substituição natural do produto por linhas mais novas do portfólio, "
                        "perda de competitividade de preço ou menor foco da equipe comercial."
                    ),
                    investigation_hypothesis=(
                        "Os dados mostram onde ocorreu a retração, mas não comprovam a causa. "
                        "Recomenda-se verificar taxas de conversão de propostas para este SKU, níveis de estoque e feedback de clientes."
                    ),
                    affected_entity=prod.product,
                )
            )

    # 2. Categorias com crescimento relevante (threshold: >= +15%)
    for cat in categories:
        if cat.growth_pct is not None and cat.growth_pct >= 15.0:
            alerts.append(
                SmartAlert(
                    id=f"growth_cat_{cat.category}",
                    title=f"Expansão acelerada na categoria: {cat.category}",
                    category="crescimento_categoria",
                    severity="positiva",
                    metric_label="Crescimento no Período",
                    metric_value=f"+{cat.growth_pct:.1f}%",
                    observed_fact=(
                        f"A categoria '{cat.category}' apresentou crescimento de {cat.growth_pct:.1f}% entre as janelas comparadas, "
                        f"acumulando {fmt_brl(cat.net_revenue)} ({cat.share_pct:.1f}% da receita total)."
                    ),
                    statistical_justification=(
                        f"Taxa de variação positiva superior a +15% com participação representativa de {cat.share_pct:.1f}% no faturamento."
                    ),
                    possible_explanation=(
                        "Aumento da demanda por soluções desta linha ou maior adesão a pacotes de maior ticket médio."
                    ),
                    investigation_hypothesis=(
                        "Avaliar se o crescimento veio de novos pedidos ou de expansão em clientes recorrentes "
                        "para direcionar campanhas de cross-sell."
                    ),
                    affected_entity=cat.category,
                )
            )

    # 3. Produtos com margem de lucro baixa (threshold: < 15% when cost data exists)
    has_cost = bool(cur_df["unit_cost"].notna().all())
    if has_cost:
        for prod in products:
            if prod.margin_pct is not None and prod.margin_pct < 15.0:
                alerts.append(
                    SmartAlert(
                        id=f"low_margin_{prod.product}",
                        title=f"Margem bruta comprimida: {prod.product}",
                        category="margem_baixa",
                        severity="alta" if prod.margin_pct < 12.0 else "media",
                        metric_label="Margem Bruta",
                        metric_value=f"{prod.margin_pct:.1f}%",
                        observed_fact=(
                            f"O produto '{prod.product}' opera com margem bruta de {prod.margin_pct:.1f}% "
                            f"(Lucro bruto de {fmt_brl(prod.gross_profit or 0.0)} sobre receita líquida de {fmt_brl(prod.net_revenue)})."
                        ),
                        statistical_justification=(
                            f"Margem bruta inferior ao piso de referência de 15,0%. Custo total de {fmt_brl(prod.total_cost or 0.0)} "
                            f"somado a {fmt_brl(prod.discounts)} em descontos concedidos."
                        ),
                        possible_explanation=(
                            "Custo de aquisição/produção elevado em relação ao preço de tabela ou concessão frequente de descontos comerciais."
                        ),
                        investigation_hypothesis=(
                            "Verificar a política de descontos aplicada pelos vendedores neste item e renegociar custos com fornecedores."
                        ),
                        affected_entity=prod.product,
                    )
                )

    # 4. Vendedores abaixo (e acima) da média da equipe
    team_avg_rev = float(np.mean([s.net_revenue for s in salespeople])) if salespeople else 0.0
    if len(salespeople) >= 2 and team_avg_rev > 0:
        for sp in salespeople:
            if sp.vs_team_avg_pct <= -25.0:
                alerts.append(
                    SmartAlert(
                        id=f"sp_below_{sp.salesperson}",
                        title=f"Desempenho abaixo da média da equipe: {sp.salesperson}",
                        category="vendedor_abaixo_media",
                        severity="media",
                        metric_label="Desvio vs. Média",
                        metric_value=f"{sp.vs_team_avg_pct:+.1f}%",
                        observed_fact=(
                            f"O vendedor '{sp.salesperson}' ({sp.region}) registrou {fmt_brl(sp.net_revenue)} em {sp.orders} pedidos, "
                            f"ficando {abs(sp.vs_team_avg_pct):.1f}% abaixo da média da equipe ({fmt_brl(team_avg_rev)})."
                        ),
                        statistical_justification=(
                            f"Faturamento individual ({fmt_brl(sp.net_revenue)}) inferior a 75% da média aritmética por vendedor ({fmt_brl(team_avg_rev)})."
                        ),
                        possible_explanation=(
                            "Pode estar associado a menor maturidade da carteira na região, menor volume de leads ou ticket médio reduzido."
                        ),
                        investigation_hypothesis=(
                            "Os dados não indicam falha individual sem contexto regional. Investigar tamanho do pipeline na região "
                            f"{sp.region} e comparar a taxa de conversão de {sp.salesperson}."
                        ),
                        affected_entity=sp.salesperson,
                    )
                )
            elif sp.vs_team_avg_pct >= 30.0:
                alerts.append(
                    SmartAlert(
                        id=f"sp_above_{sp.salesperson}",
                        title=f"Desempenho de destaque acima da média: {sp.salesperson}",
                        category="vendedor_acima_media",
                        severity="positiva",
                        metric_label="Acima da Média",
                        metric_value=f"+{sp.vs_team_avg_pct:.1f}%",
                        observed_fact=(
                            f"'{sp.salesperson}' ({sp.region}) liderou com {fmt_brl(sp.net_revenue)} ({sp.share_pct:.1f}% do total), "
                            f"superando a média da equipe em +{sp.vs_team_avg_pct:.1f}% com ticket médio de {fmt_brl(sp.average_ticket)}."
                        ),
                        statistical_justification=(
                            f"Superação superior a +30% em relação à média da equipe ({fmt_brl(team_avg_rev)})."
                        ),
                        possible_explanation=(
                            f"Alta concentração de vendas na categoria '{sp.top_category}' e maior quantidade média de itens por pedido."
                        ),
                        investigation_hypothesis=(
                            "Mapear as práticas de abordagem e mix de produtos ofertados por este vendedor para replicar no restante do time."
                        ),
                        affected_entity=sp.salesperson,
                    )
                )

    # 5. Concentração excessiva do faturamento em poucos produtos (Pareto Top 3)
    top3_share = round(sum(p.share_pct for p in products[:3]), 2) if products else 0.0
    top5_share = round(sum(p.share_pct for p in products[:5]), 2) if products else 0.0
    if len(products) >= 4 and top3_share >= 55.0:
        top_names = ", ".join(p.product for p in products[:3])
        alerts.append(
            SmartAlert(
                id="concentration_top3",
                title="Concentração elevada de faturamento no Top 3 produtos",
                category="concentracao",
                severity="media" if top3_share < 70.0 else "alta",
                metric_label="Share Top 3 Produtos",
                metric_value=f"{top3_share:.1f}%",
                observed_fact=(
                    f"Os 3 principais produtos ({top_names}) concentram {top3_share:.1f}% de todo o faturamento líquido do período."
                ),
                statistical_justification=(
                    f"Índice de concentração CR3 = {top3_share:.1f}% (acima do limiar de diversificação de 55,0% para portfólios com {len(products)} itens)."
                ),
                possible_explanation=(
                    "Forte dependência comercial dos produtos carros-chefe da empresa."
                ),
                investigation_hypothesis=(
                    "Avaliar o risco de dependência de receita e criar pacotes combinados (bundling) para estimular produtos secundários de boa margem."
                ),
                affected_entity="Portfólio de Produtos",
            )
        )

    # 6. Períodos com redução significativa de vendas / variações incomuns (Z-score / desvio vs média móvel)
    if len(evolution) >= 4:
        revs = np.array([pt.net_revenue for pt in evolution], dtype=float)
        mean_rev = float(np.mean(revs))
        std_rev = float(np.std(revs))
        for pt in evolution:
            if mean_rev > 0:
                deviation_pct = ((pt.net_revenue - mean_rev) / mean_rev) * 100.0
                z_score = (pt.net_revenue - mean_rev) / std_rev if std_rev > 1e-9 else 0.0
                if deviation_pct <= -25.0 and z_score <= -1.2:
                    alerts.append(
                        SmartAlert(
                            id=f"period_dip_{pt.period}",
                            title=f"Redução atípica de faturamento no período {pt.period}",
                            category="queda_periodo",
                            severity="alta",
                            metric_label=f"Desvio em {pt.period}",
                            metric_value=f"{deviation_pct:+.1f}%",
                            observed_fact=(
                                f"O período '{pt.period}' registrou faturamento líquido de {fmt_brl(pt.net_revenue)} ({pt.orders} pedidos), "
                                f"uma retração de {abs(deviation_pct):.1f}% frente à média histórica da série ({fmt_brl(mean_rev)})."
                            ),
                            statistical_justification=(
                                f"Anomalia estatística detectada: Z-score = {z_score:.2f} desvios-padrão abaixo da média da série temporal "
                                f"(média = {fmt_brl(mean_rev)}, desvio-padrão = {fmt_brl(std_rev)})."
                            ),
                            possible_explanation=(
                                "Sazonalidade comercial do setor, menor número de dias úteis operacionais ou atraso no fechamento de ciclos de vendas."
                            ),
                            investigation_hypothesis=(
                                "Os dados comprovam a queda puntual no volume de pedidos em "
                                f"{pt.period}, mas não apontam um evento externo específico. "
                                "Cruzar este período com campanhas ativas, férias da equipe ou indisponibilidade de estoque."
                            ),
                            affected_entity=pt.period,
                        )
                    )

    high_count = sum(1 for a in alerts if a.severity == "alta")
    med_count = sum(1 for a in alerts if a.severity == "media")
    pos_count = sum(1 for a in alerts if a.severity == "positiva")

    return AnalysisResponse(
        has_data=True,
        summary={
            "total_alerts": len(alerts),
            "high_severity": high_count,
            "medium_severity": med_count,
            "positive_highlights": pos_count,
            "period_analyzed": p_label,
            "comparison_period": prev_label,
        },
        alerts=alerts,
        concentration_top3_pct=top3_share,
        concentration_top5_pct=top5_share,
        team_average_revenue=round(team_avg_rev, 2),
    )
