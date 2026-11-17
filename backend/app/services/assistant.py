import re
import unicodedata
from datetime import date
from typing import Any, Dict, List, Optional, Tuple
import httpx
import pandas as pd
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.config import settings
from app.models import AppSetting
from app.schemas import AssistantQueryRequest, AssistantQueryResponse, FilterParams
from app.services.analyzer import fmt_brl, run_intelligent_analysis
from app.services.metrics import (
    build_category_breakdown,
    build_product_performance,
    build_region_breakdown,
    build_revenue_evolution,
    build_salesperson_performance,
    calculate_kpi_metrics,
    fetch_records_df,
    safe_growth_pct,
    split_current_and_previous_df,
)


def normalize_text(text: str) -> str:
    t = text.strip().lower()
    t = "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn")
    return t


def get_runtime_ai_config(db: Session) -> Dict[str, str]:
    """Reads runtime AI configuration from DB settings, falling back to environment settings."""
    rows = db.execute(select(AppSetting)).scalars().all()
    db_map = {r.key: r.value for r in rows}
    return {
        "ai_provider": db_map.get("ai_provider", settings.ai_provider),
        "openai_api_key": db_map.get("openai_api_key", settings.openai_api_key),
        "openai_model": db_map.get("openai_model", settings.openai_model),
        "gemini_api_key": db_map.get("gemini_api_key", settings.gemini_api_key),
        "gemini_model": db_map.get("gemini_model", settings.gemini_model),
    }


def detect_intent(question: str) -> str:
    """
    Deterministic intent classifier for commercial BI questions.
    """
    q = normalize_text(question)

    if any(k in q for k in ["por que", "porque", "caiu", "motivo", "causa"]):
        if any(k in q for k in ["faturamento", "receita", "venda", "vendas", "caiu", "queda"]):
            return "diagnostico_queda_faturamento"

    if any(k in q for k in ["atencao", "alerta", "problema", "risco", "anomalia", "preocupar", "pontos", "oportunidade", "oportunidades", "melhoria", "melhorar"]):
        return "pontos_de_atencao"

    if any(k in q for k in ["margem", "lucro", "rentabilidade", "custo"]):
        if any(k in q for k in ["baixa", "menor", "pior", "comprimida", "produtos"]):
            return "produtos_menor_margem"
        return "lucro_e_margem"

    if any(k in q for k in ["ticket medio", "ticket", "valor medio por pedido"]):
        return "ticket_medio"

    if any(k in q for k in ["queda", "cairam", "retracao", "diminuiram", "perderam", "pior produto"]):
        if any(k in q for k in ["produto", "produtos", "item", "itens", "vendas"]):
            return "produtos_em_queda"

    if any(k in q for k in ["categoria", "categorias"]):
        if any(k in q for k in ["crescimento", "cresceu", "maior alta", "expansao"]):
            return "categoria_maior_crescimento"
        return "desempenho_categorias"

    if any(k in q for k in ["vendedor", "vendedores", "equipe", "consultor", "representante"]):
        return "desempenho_vendedores"

    if any(k in q for k in ["regiao", "regioes", "estado", "uf", "regional"]):
        return "desempenho_regioes"

    if any(k in q for k in ["produto", "produtos", "item", "mais vendido", "vendeu mais", "campeao", "ranking"]):
        return "produto_mais_vendido"

    if any(k in q for k in ["aumentou", "diminuiu", "comparacao", "mes anterior", "periodo anterior", "em relacao ao anterior", "evolucao", "crescimento"]):
        return "comparacao_periodos"

    if any(k in q for k in ["faturamento", "receita", "quanto vendemos", "total de vendas", "este mes", "neste mes"]):
        return "faturamento_periodo"

    return "resumo_geral"


def extract_implicit_filters(
    question: str,
    base_filters: FilterParams,
    full_df: pd.DataFrame,
) -> Tuple[FilterParams, Dict[str, Any]]:
    """
    Inspects the question for references to "este mês" / "último mês" or specific categories/regions/salespeople
    present in the database, merging them safely with explicit UI filters.
    """
    q = normalize_text(question)
    effective = base_filters.model_copy(deep=True)
    notes: List[str] = []

    if not full_df.empty:
        # Check if user specifically asks for "este mês" or "neste mês" or "último mês" and no date filter was set
        if not effective.start_date and not effective.end_date:
            if any(term in q for term in ["este mes", "neste mes", "ultimo mes", "mes atual"]):
                max_dt = full_df["sale_date"].max()
                first_of_month = date(max_dt.year, max_dt.month, 1)
                effective.start_date = first_of_month
                effective.end_date = max_dt.date()
                notes.append(f"Filtro temporal automático aplicado para o mês mais recente na base ({first_of_month.isoformat()} a {max_dt.date().isoformat()}).")

        # Check if question mentions a known category
        if not effective.category:
            for cat in full_df["category"].dropna().unique():
                if normalize_text(str(cat)) in q:
                    effective.category = str(cat)
                    notes.append(f"Categoria identificada na pergunta: {cat}")
                    break

        # Check if question mentions a known region
        if not effective.region:
            for reg in full_df["region"].dropna().unique():
                if f" {normalize_text(str(reg))}" in f" {q}":
                    effective.region = str(reg)
                    notes.append(f"Região identificada na pergunta: {reg}")
                    break

        # Check if question mentions a known salesperson
        if not effective.salesperson:
            for sp in full_df["salesperson"].dropna().unique():
                if normalize_text(str(sp)) in q:
                    effective.salesperson = str(sp)
                    notes.append(f"Vendedor identificado na pergunta: {sp}")
                    break

    applied_dict = {
        "start_date": effective.start_date.isoformat() if effective.start_date else "Todo o histórico",
        "end_date": effective.end_date.isoformat() if effective.end_date else "Todo o histórico",
        "category": effective.category or "Todas",
        "product": effective.product or "Todos",
        "salesperson": effective.salesperson or "Todos",
        "region": effective.region or "Todas",
        "filter_notes": notes,
    }
    return effective, applied_dict


def call_optional_llm(
    ai_cfg: Dict[str, str],
    question: str,
    intent: str,
    deterministic_answer: str,
    indicators: Dict[str, Any],
    applied_filters: Dict[str, Any],
) -> Tuple[Optional[str], str, str]:
    """
    Optionally calls OpenAI or Gemini to format a natural-language executive explanation
    strictly grounded in the pre-calculated Python indicators.
    Never invents numbers; falls back transparently to deterministic mode if unconfigured or on error.
    """
    provider = (ai_cfg.get("ai_provider") or "deterministic").lower()
    if provider == "deterministic":
        return None, "deterministic", "Modo determinístico ativo (cálculos diretos via Python/SQL sem chamada externa de LLM)."

    system_prompt = (
        "Você é o SalesPilot AI, um analista sênior de Business Intelligence. "
        "REGRA INVIOLÁVEL: Utilize EXCLUSIVAMENTE os números exatos fornecidos no bloco 'INDICADORES CALCULADOS PELO PYTHON'. "
        "NUNCA invente números, NUNCA arredonde de forma divergente e NUNCA afirme causas externas que não estejam comprovadas nos dados. "
        "Diferencie claramente o fato observado nos dados de hipóteses para investigação. Responda em português claro, executivo e objetivo."
    )
    user_prompt = (
        f"Pergunta do usuário: {question}\n"
        f"Intenção classificada: {intent}\n"
        f"Filtros aplicados: {applied_filters}\n"
        f"INDICADORES CALCULADOS PELO PYTHON: {indicators}\n"
        f"Resposta base determinística verificada: {deterministic_answer}\n\n"
        "Elabore uma resposta executiva concisa (2 a 4 parágrafos curtos) mantendo 100% de fidelidade aos valores acima."
    )

    if provider == "openai":
        api_key = (ai_cfg.get("openai_api_key") or "").strip()
        model = (ai_cfg.get("openai_model") or "gpt-4o-mini").strip()
        if not api_key:
            return (
                None,
                "fallback_deterministic",
                "Provedor OpenAI selecionado, porém nenhuma chave de API foi configurada. Respondendo com motor determinístico Python.",
            )
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "model": model,
                        "temperature": 0.1,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"].strip()
                    return content, "openai", f"Resposta redigida pelo modelo OpenAI ({model}) sobre cálculos determinísticos Python."
                return (
                    None,
                    "fallback_deterministic",
                    f"API OpenAI retornou status {resp.status_code}. Utilizando resposta determinística verificada.",
                )
        except Exception as exc:
            return (
                None,
                "fallback_deterministic",
                f"Falha de comunicação com OpenAI ({type(exc).__name__}). Utilizando resposta determinística verificada.",
            )

    if provider == "gemini":
        api_key = (ai_cfg.get("gemini_api_key") or "").strip()
        model = (ai_cfg.get("gemini_model") or "gemini-2.5-flash").strip()
        if not api_key:
            return (
                None,
                "fallback_deterministic",
                "Provedor Google Gemini selecionado, porém nenhuma chave de API foi configurada. Respondendo com motor determinístico Python.",
            )
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(
                    url,
                    headers={"Content-Type": "application/json"},
                    json={
                        "contents": [{"parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}],
                        "generationConfig": {"temperature": 0.1},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return content, "gemini", f"Resposta redigida pelo modelo Google Gemini ({model}) sobre cálculos determinísticos Python."
                return (
                    None,
                    "fallback_deterministic",
                    f"API Gemini retornou status {resp.status_code}. Utilizando resposta determinística verificada.",
                )
        except Exception as exc:
            return (
                None,
                "fallback_deterministic",
                f"Falha de comunicação com Google Gemini ({type(exc).__name__}). Utilizando resposta determinística verificada.",
            )

    return None, "deterministic", "Modo determinístico ativo."


def process_assistant_query(db: Session, req: AssistantQueryRequest) -> AssistantQueryResponse:
    """
    Executes the 10-step safe conversational analytics pipeline:
    1. Receive question
    2. Identify intent
    3. Identify required filters
    4. Query structured data (parameterized SQLAlchemy)
    5. Execute calculations with Python/Pandas
    6. Build structured context with results
    7. Send results to LLM only when configured/available
    8. Generate understandable response
    9. Present indicators and filters used
    10. Inform when there is insufficient data
    """
    intent = detect_intent(req.question)
    base_filters = FilterParams(
        start_date=req.start_date,
        end_date=req.end_date,
        category=req.category,
        product=req.product,
        salesperson=req.salesperson,
        region=req.region,
        include_demo=True,
    )

    all_df = fetch_records_df(db, FilterParams(include_demo=True), apply_date_filter=False)
    effective_filters, applied_filters_dict = extract_implicit_filters(req.question, base_filters, all_df)

    if all_df.empty:
        return AssistantQueryResponse(
            question=req.question,
            intent=intent,
            answer=(
                "Não há dados suficientes carregados na plataforma para responder a esta pergunta. "
                "Importe uma planilha CSV/XLSX na página 'Importação de Dados' ou clique em 'Carregar Demonstração' para testar."
            ),
            mode="deterministic",
            provider_status="Sem dados na base para processamento.",
            sufficient_data=False,
            applied_filters=applied_filters_dict,
            calculated_indicators={},
            supporting_table=[],
            methodology_note="Nenhum cálculo executado pois a base de vendas está vazia.",
        )

    entity_df = fetch_records_df(db, effective_filters, apply_date_filter=False)
    cur_df, prev_df, p_label, prev_label = split_current_and_previous_df(
        entity_df,
        start_date=effective_filters.start_date,
        end_date=effective_filters.end_date,
    )

    if cur_df.empty:
        return AssistantQueryResponse(
            question=req.question,
            intent=intent,
            answer=(
                "Não foram encontrados registros de vendas para os filtros selecionados. "
                "Tente ampliar o período de datas ou remover filtros restritivos de categoria/vendedor."
            ),
            mode="deterministic",
            provider_status="Dados insuficientes para o recorte filtrado.",
            sufficient_data=False,
            applied_filters=applied_filters_dict,
            calculated_indicators={"registros_encontrados": 0},
            supporting_table=[],
            methodology_note="Consulta parametrizada executada sem registros correspondentes.",
        )

    comp_cur_df = cur_df
    if not effective_filters.start_date and not effective_filters.end_date and not entity_df.empty:
        min_ts = entity_df["sale_date"].min()
        max_ts = entity_df["sale_date"].max()
        total_days = max((max_ts - min_ts).days + 1, 1)
        if total_days >= 14:
            half_days = total_days // 2
            mid_point = max_ts - pd.Timedelta(days=half_days - 1)
            comp_cur_df = entity_df[(entity_df["sale_date"] >= mid_point) & (entity_df["sale_date"] <= max_ts)]

    kpis = calculate_kpi_metrics(cur_df, prev_df, p_label, prev_label, comp_cur_df)
    products = build_product_performance(cur_df, comp_cur_df, prev_df)
    categories = build_category_breakdown(cur_df, comp_cur_df, prev_df)
    salespeople = build_salesperson_performance(cur_df, comp_cur_df, prev_df)
    regions = build_region_breakdown(cur_df)
    evolution = build_revenue_evolution(cur_df)

    indicators: Dict[str, Any] = {}
    supporting_table: List[Dict[str, Any]] = []
    det_answer = ""
    methodology = ""

    if intent == "faturamento_periodo":
        growth_str = (
            f"uma variação de {kpis.revenue_growth_pct:+.1f}% em relação ao período comparativo ({prev_label})"
            if kpis.revenue_growth_pct is not None
            else "sem período anterior equivalente para comparação"
        )
        det_answer = (
            f"No período analisado, o faturamento líquido foi de {fmt_brl(kpis.net_revenue)} "
            f"(faturamento bruto de {fmt_brl(kpis.gross_revenue)} menos {fmt_brl(kpis.total_discounts)} em descontos), "
            f"distribuído em {kpis.total_orders} pedidos únicos e {kpis.total_items_sold:.0f} unidades vendidas ({growth_str})."
        )
        indicators = {
            "Faturamento Líquido": fmt_brl(kpis.net_revenue),
            "Faturamento Bruto": fmt_brl(kpis.gross_revenue),
            "Descontos Concedidos": fmt_brl(kpis.total_discounts),
            "Pedidos Únicos": kpis.total_orders,
            "Variação vs. Período Anterior": f"{kpis.revenue_growth_pct:+.1f}%" if kpis.revenue_growth_pct is not None else "N/D",
        }
        supporting_table = [
            {
                "Período": pt.period,
                "Faturamento Líquido": fmt_brl(pt.net_revenue),
                "Pedidos": pt.orders,
                "Itens Vendidos": int(pt.items_sold),
            }
            for pt in evolution[-6:]
        ]
        methodology = "Soma determinística de (quantidade × preço unitário) - descontos nos registros validados."

    elif intent == "produto_mais_vendido":
        by_qty = sorted(products, key=lambda x: x.items_sold, reverse=True)
        by_rev = products  # already sorted by net_revenue desc
        top_qty = by_qty[0]
        top_rev = by_rev[0]
        if top_qty.product == top_rev.product:
            det_answer = (
                f"O produto '{top_qty.product}' ({top_qty.category}) liderou tanto em volume quanto em receita no período selecionado, "
                f"com {top_qty.items_sold:.0f} unidades vendidas em {top_qty.orders} pedidos e faturamento líquido de "
                f"{fmt_brl(top_qty.net_revenue)} ({top_qty.share_pct:.1f}% do total)."
            )
        else:
            det_answer = (
                f"Em quantidade de unidades, o produto mais vendido foi '{top_qty.product}' com {top_qty.items_sold:.0f} unidades vendidas "
                f"({fmt_brl(top_qty.net_revenue)}). Já em faturamento líquido, o líder foi '{top_rev.product}' com "
                f"{fmt_brl(top_rev.net_revenue)} ({top_rev.share_pct:.1f}% da receita total e {top_rev.items_sold:.0f} unidades)."
            )
        indicators = {
            "Líder em Quantidade": f"{top_qty.product} ({top_qty.items_sold:.0f} un.)",
            "Líder em Faturamento": f"{top_rev.product} ({fmt_brl(top_rev.net_revenue)})",
            "Participação do Líder (Receita)": f"{top_rev.share_pct:.1f}%",
        }
        supporting_table = [
            {
                "Produto": p.product,
                "Categoria": p.category,
                "Unidades Vendidas": int(p.items_sold),
                "Faturamento Líquido": fmt_brl(p.net_revenue),
                "Share (%)": f"{p.share_pct:.1f}%",
            }
            for p in by_rev[:5]
        ]
        methodology = "Agrupamento por produto ordenado por unidades vendidas (SUM(quantity)) e por receita líquida (SUM(net_revenue))."

    elif intent == "categoria_maior_crescimento" or intent == "desempenho_categorias":
        top_cat = categories[0]
        with_growth = [c for c in categories if c.growth_pct is not None]
        if with_growth:
            best_cat = max(with_growth, key=lambda c: c.growth_pct or -9999.0)
            det_answer = (
                f"A categoria que mais contribuiu para o faturamento no período foi '{top_cat.category}', gerando "
                f"{fmt_brl(top_cat.net_revenue)} ({top_cat.share_pct:.1f}% de participação na receita líquida total em {top_cat.orders} pedidos). "
                f"Em ritmo de expansão, a categoria com maior crescimento percentual entre as janelas comparadas ({p_label} vs. {prev_label}) "
                f"foi '{best_cat.category}', avançando {best_cat.growth_pct:+.1f}%."
            )
            indicators = {
                "Maior Contribuição (Receita)": f"{top_cat.category} ({fmt_brl(top_cat.net_revenue)})",
                "Share da Categoria Líder": f"{top_cat.share_pct:.1f}%",
                "Maior Crescimento (%)": f"{best_cat.category} ({best_cat.growth_pct:+.1f}%)",
                "Pedidos na Categoria Líder": top_cat.orders,
            }
        else:
            det_answer = (
                f"A categoria que mais contribuiu no período selecionado foi '{top_cat.category}' com {fmt_brl(top_cat.net_revenue)} "
                f"({top_cat.share_pct:.1f}% do faturamento total). Não há dados de período anterior equivalente suficientes para calcular taxa de crescimento."
            )
            indicators = {
                "Categoria Líder": top_cat.category,
                "Faturamento Líquido": fmt_brl(top_cat.net_revenue),
                "Share (%)": f"{top_cat.share_pct:.1f}%",
            }
        supporting_table = [
            {
                "Categoria": c.category,
                "Faturamento Líquido": fmt_brl(c.net_revenue),
                "Share (%)": f"{c.share_pct:.1f}%",
                "Variação (%)": f"{c.growth_pct:+.1f}%" if c.growth_pct is not None else "N/D",
            }
            for c in categories
        ]
        methodology = "Agrupamento de receita líquida por categoria e comparação determinística entre a janela atual e a janela anterior equivalente."

    elif intent == "produtos_em_queda":
        declining = sorted(
            [p for p in products if p.growth_pct is not None and p.growth_pct < 0],
            key=lambda x: x.growth_pct or 0.0,
        )
        if declining:
            worst = declining[0]
            names_list = ", ".join(f"{p.product} ({p.growth_pct:+.1f}%)" for p in declining[:4])
            det_answer = (
                f"Foram identificados {len(declining)} produto(s) com retração nas vendas na comparação entre {p_label} e {prev_label}: "
                f"{names_list}. A queda mais acentuada ocorreu em '{worst.product}' ({worst.growth_pct:+.1f}%). "
                f"Nota analítica: os dados mostram onde ocorreu a retração, mas não comprovam sua causa externa."
            )
            indicators = {
                "Produtos em Retração": len(declining),
                "Maior Queda Percentual": f"{worst.product} ({worst.growth_pct:+.1f}%)",
                "Faturamento Atual do Item": fmt_brl(worst.net_revenue),
            }
            supporting_table = [
                {
                    "Produto": p.product,
                    "Categoria": p.category,
                    "Faturamento no Período": fmt_brl(p.net_revenue),
                    "Variação (%)": f"{p.growth_pct:+.1f}%",
                }
                for p in declining
            ]
        else:
            det_answer = "Nenhum produto apresentou queda de faturamento na comparação entre os períodos analisados."
            indicators = {"Produtos em Retração": 0, "Janela Comparada": f"{p_label} vs {prev_label}"}
            supporting_table = [
                {
                    "Produto": p.product,
                    "Faturamento Líquido": fmt_brl(p.net_revenue),
                    "Variação (%)": f"{p.growth_pct:+.1f}%" if p.growth_pct is not None else "N/D",
                }
                for p in products[:5]
            ]
        methodology = "Filtro de produtos com variação percentual negativa entre o período analisado e o período anterior equivalente."

    elif intent == "desempenho_vendedores":
        top_sp = salespeople[0]
        low_sp = salespeople[-1]
        team_avg = sum(s.net_revenue for s in salespeople) / len(salespeople) if salespeople else 0.0
        det_answer = (
            f"O vendedor com melhor desempenho no período foi '{top_sp.salesperson}' ({top_sp.region}), gerando "
            f"{fmt_brl(top_sp.net_revenue)} em {top_sp.orders} pedidos (ticket médio de {fmt_brl(top_sp.average_ticket)}), "
            f"o que representa {top_sp.share_pct:.1f}% do faturamento total e {top_sp.vs_team_avg_pct:+.1f}% em relação à média da equipe ({fmt_brl(team_avg)}). "
            f"Na outra ponta, '{low_sp.salesperson}' ({low_sp.region}) registrou {fmt_brl(low_sp.net_revenue)} ({low_sp.vs_team_avg_pct:+.1f}% vs. média)."
        )
        indicators = {
            "1º Lugar em Vendas": f"{top_sp.salesperson} ({fmt_brl(top_sp.net_revenue)})",
            "Ticket Médio do Líder": fmt_brl(top_sp.average_ticket),
            "Média da Equipe": fmt_brl(team_avg),
            "Desvio do Líder vs. Média": f"{top_sp.vs_team_avg_pct:+.1f}%",
        }
        supporting_table = [
            {
                "Vendedor": s.salesperson,
                "Região": s.region,
                "Faturamento Líquido": fmt_brl(s.net_revenue),
                "Pedidos": s.orders,
                "Ticket Médio": fmt_brl(s.average_ticket),
                "vs. Média Equipe": f"{s.vs_team_avg_pct:+.1f}%",
            }
            for s in salespeople
        ]
        methodology = "Agrupamento por vendedor com cálculo de receita líquida, pedidos únicos, ticket médio e desvio percentual frente à média da equipe."

    elif intent == "ticket_medio":
        det_answer = (
            f"O ticket médio no período selecionado foi de {fmt_brl(kpis.average_ticket)}, calculado a partir do "
            f"faturamento líquido de {fmt_brl(kpis.net_revenue)} dividido por {kpis.total_orders} pedidos únicos "
            f"(não confundindo com as {kpis.total_items_sold:.0f} unidades totais de itens vendidos)."
        )
        if kpis.ticket_growth_pct is not None:
            det_answer += f" Em relação ao período comparativo ({prev_label}), o ticket médio variou {kpis.ticket_growth_pct:+.1f}%."
        indicators = {
            "Ticket Médio (Por Pedido)": fmt_brl(kpis.average_ticket),
            "Faturamento Líquido": fmt_brl(kpis.net_revenue),
            "Quantidade de Pedidos Únicos": kpis.total_orders,
            "Quantidade de Itens Vendidos": int(kpis.total_items_sold),
            "Variação do Ticket Médio": f"{kpis.ticket_growth_pct:+.1f}%" if kpis.ticket_growth_pct is not None else "N/D",
        }
        supporting_table = [
            {
                "Região": r.region,
                "Pedidos Únicos": r.orders,
                "Faturamento Líquido": fmt_brl(r.net_revenue),
                "Ticket Médio Regional": fmt_brl(r.average_ticket),
            }
            for r in regions
        ]
        methodology = "Ticket Médio = Faturamento Líquido ÷ Quantidade de Pedidos Únicos (COUNT(DISTINCT order_id))."

    elif intent in ("produtos_menor_margem", "lucro_e_margem"):
        if not kpis.has_cost_data:
            det_answer = (
                "O conjunto de dados analisado não possui o custo unitário de todos os produtos. "
                "Seguindo as regras de integridade financeira do SalesPilot AI, o lucro bruto e a margem de lucro não são inventados nem estimados sem dados de custo."
            )
            indicators = {
                "Disponibilidade de Custo": "Indisponível na planilha atual",
                "Faturamento Líquido": fmt_brl(kpis.net_revenue),
            }
            supporting_table = []
            methodology = "Bloqueio de segurança: cálculo de lucro e margem desativado quando a coluna de custo está ausente."
        else:
            by_margin = sorted(products, key=lambda p: p.margin_pct if p.margin_pct is not None else 999.0)
            lowest = by_margin[0]
            highest = by_margin[-1]
            det_answer = (
                f"No período selecionado, o lucro bruto estimado total foi de {fmt_brl(kpis.gross_profit or 0.0)}, "
                f"correspondendo a uma margem bruta global de {kpis.profit_margin_pct:.1f}%. "
                f"O produto com a margem de lucro mais baixa é '{lowest.product}' ({lowest.category}), com margem de "
                f"apenas {lowest.margin_pct:.1f}% (lucro de {fmt_brl(lowest.gross_profit or 0.0)} sobre receita líquida de {fmt_brl(lowest.net_revenue)}). "
                f"Já a maior margem pertence a '{highest.product}' ({highest.margin_pct:.1f}%)."
            )
            indicators = {
                "Lucro Bruto Total": fmt_brl(kpis.gross_profit or 0.0),
                "Margem de Lucro Global": f"{kpis.profit_margin_pct:.1f}%",
                "Menor Margem": f"{lowest.product} ({lowest.margin_pct:.1f}%)",
                "Maior Margem": f"{highest.product} ({highest.margin_pct:.1f}%)",
            }
            supporting_table = [
                {
                    "Produto": p.product,
                    "Faturamento Líquido": fmt_brl(p.net_revenue),
                    "Custo Total": fmt_brl(p.total_cost or 0.0),
                    "Lucro Bruto": fmt_brl(p.gross_profit or 0.0),
                    "Margem (%)": f"{p.margin_pct:.1f}%" if p.margin_pct is not None else "N/D",
                }
                for p in by_margin
            ]
            methodology = "Margem Bruta (%) = ((Faturamento Líquido - Custo Total) ÷ Faturamento Líquido) × 100."

    elif intent in ("comparacao_periodos", "diagnostico_queda_faturamento"):
        # Check both overall period comparison AND latest month vs previous month in evolution
        latest_month_note = ""
        if len(evolution) >= 2:
            last_pt = evolution[-1]
            prev_pt = evolution[-2]
            m_growth = safe_growth_pct(last_pt.net_revenue, prev_pt.net_revenue)
            direction = "aumentou" if (m_growth or 0) >= 0 else "diminuiu"
            latest_month_note = (
                f" Observando especificamente o último período fechado ({last_pt.period}: {fmt_brl(last_pt.net_revenue)}) "
                f"em relação ao imediatamente anterior ({prev_pt.period}: {fmt_brl(prev_pt.net_revenue)}), "
                f"o faturamento {direction} {abs(m_growth or 0):.1f}%."
            )

        # Also check if there was any sharp dip period in the series
        min_pt = min(evolution, key=lambda x: x.net_revenue) if evolution else None
        declining_prods = sorted([p for p in products if (p.growth_pct or 0) < 0], key=lambda x: x.growth_pct or 0)
        worst_prod_str = (
            f"O produto '{declining_prods[0].product}' teve a maior retração percentual ({declining_prods[0].growth_pct:+.1f}%)."
            if declining_prods
            else ""
        )

        if kpis.revenue_growth_pct is not None:
            dir_global = "crescimento" if kpis.revenue_growth_pct >= 0 else "redução"
            det_answer = (
                f"Na comparação entre as janelas equivalentes ({p_label} vs. {prev_label}), os dados mostram {dir_global} de "
                f"{abs(kpis.revenue_growth_pct):.1f}% no faturamento líquido.{latest_month_note} "
                f"{worst_prod_str} "
            )
            if min_pt:
                det_answer += f"O ponto de menor faturamento na série ocorreu em {min_pt.period} ({fmt_brl(min_pt.net_revenue)}). "
            det_answer += (
                "Importante: os números indicam exatamente onde ocorreram as oscilações (quais meses, categorias e produtos), "
                "mas não comprovam isoladamente a causa externa."
            )
        else:
            det_answer = f"Faturamento líquido atual de {fmt_brl(kpis.net_revenue)}.{latest_month_note}"

        indicators = {
            "Variação entre Janelas": f"{kpis.revenue_growth_pct:+.1f}%" if kpis.revenue_growth_pct is not None else "N/D",
            "Período de Menor Receita": f"{min_pt.period} ({fmt_brl(min_pt.net_revenue)})" if min_pt else "N/D",
            "Último Período da Série": f"{evolution[-1].period} ({fmt_brl(evolution[-1].net_revenue)})" if evolution else "N/D",
        }
        supporting_table = [
            {
                "Período": pt.period,
                "Faturamento Líquido": fmt_brl(pt.net_revenue),
                "Pedidos": pt.orders,
                "Unidades": int(pt.items_sold),
            }
            for pt in evolution
        ]
        methodology = "Comparação temporal determinística entre períodos equivalentes e análise da série mensal."

    elif intent == "desempenho_regioes":
        top_reg = regions[0]
        det_answer = (
            f"A região com maior faturamento líquido é '{top_reg.region}', somando {fmt_brl(top_reg.net_revenue)} "
            f"({top_reg.share_pct:.1f}% do total) em {top_reg.orders} pedidos únicos, com ticket médio de {fmt_brl(top_reg.average_ticket)}."
        )
        indicators = {
            "Região Líder": top_reg.region,
            "Faturamento Regional": fmt_brl(top_reg.net_revenue),
            "Participação (%)": f"{top_reg.share_pct:.1f}%",
            "Ticket Médio Regional": fmt_brl(top_reg.average_ticket),
        }
        supporting_table = [
            {
                "Região": r.region,
                "Faturamento Líquido": fmt_brl(r.net_revenue),
                "Share (%)": f"{r.share_pct:.1f}%",
                "Pedidos": r.orders,
                "Ticket Médio": fmt_brl(r.average_ticket),
            }
            for r in regions
        ]
        methodology = "Agrupamento regional parametrizado ordenado por faturamento líquido."

    else:
        # pontos_de_atencao or resumo_geral
        analysis = run_intelligent_analysis(db, effective_filters)
        high_alerts = [a for a in analysis.alerts if a.severity in ("alta", "media")]
        if high_alerts:
            bullet_summary = " | ".join(f"{a.title} ({a.metric_value})" for a in high_alerts[:4])
            det_answer = (
                f"Foram identificados {len(high_alerts)} pontos de atenção prioritários nos dados: {bullet_summary}. "
                f"No consolidado do período, o faturamento líquido é de {fmt_brl(kpis.net_revenue)} em {kpis.total_orders} pedidos "
                f"(ticket médio de {fmt_brl(kpis.average_ticket)}). Cada alerta separa o fato observado de hipóteses para investigação."
            )
        else:
            det_answer = (
                f"No período selecionado, a operação soma {fmt_brl(kpis.net_revenue)} de faturamento líquido em {kpis.total_orders} pedidos "
                f"(ticket médio de {fmt_brl(kpis.average_ticket)}). Não foram detectadas anomalias críticas nos filtros atuais."
            )
        indicators = {
            "Faturamento Líquido": fmt_brl(kpis.net_revenue),
            "Ticket Médio": fmt_brl(kpis.average_ticket),
            "Alertas Identificados": len(analysis.alerts),
            "Concentração Top 3 Produtos": f"{analysis.concentration_top3_pct:.1f}%",
        }
        supporting_table = [
            {
                "Alerta": a.title,
                "Severidade": a.severity.upper(),
                "Indicador": f"{a.metric_label}: {a.metric_value}",
                "Fato Observado": a.observed_fact,
            }
            for a in analysis.alerts[:6]
        ]
        methodology = "Motor de diagnóstico estatístico combinando variação entre períodos, margem bruta, desvio de equipe e índice de concentração CR3."

    ai_cfg = get_runtime_ai_config(db)
    llm_text, mode, provider_status = call_optional_llm(
        ai_cfg=ai_cfg,
        question=req.question,
        intent=intent,
        deterministic_answer=det_answer,
        indicators=indicators,
        applied_filters=applied_filters_dict,
    )

    final_answer = llm_text if llm_text else det_answer

    return AssistantQueryResponse(
        question=req.question,
        intent=intent,
        answer=final_answer,
        mode=mode,
        provider_status=provider_status,
        sufficient_data=True,
        applied_filters=applied_filters_dict,
        calculated_indicators=indicators,
        supporting_table=supporting_table,
        methodology_note=methodology,
    )
