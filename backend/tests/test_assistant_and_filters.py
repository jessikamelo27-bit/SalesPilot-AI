def test_demo_load_clear_preserves_real_user_data(client):
    """
    Verifies that loading and clearing synthetic demo data strictly preserves real imported user data.
    """
    # 1. Clear initial demo data seeded on startup
    client.post("/api/demo/clear")

    # 2. Import 1 real user record
    csv_real = (
        "Data da venda,Numero do pedido,Produto,Categoria,Quantidade vendida,Preco unitario,Desconto,Custo do produto,Vendedor,Regiao,Forma de pagamento\n"
        "2026-10-15,REAL-001,Produto Real Cliente,Categoria Real,2,1000.00,0.00,500.00,Vendedor Real,Sudeste,PIX\n"
    )
    up = client.post("/api/imports/upload", files={"file": ("real.csv", csv_real.encode("utf-8"), "text/csv")}).json()
    client.post(f"/api/imports/{up['batch_id']}/confirm")

    # 3. Load synthetic demo data
    load_resp = client.post("/api/demo/load")
    assert load_resp.status_code == 200
    assert load_resp.json()["demo_records_loaded"] > 500

    # Verify both real and demo exist
    dash = client.get("/api/dashboard").json()
    assert dash["real_records_count"] == 1
    assert dash["demo_records_count"] > 500

    # 4. Clear synthetic demo data -> real record MUST remain intact
    clear_resp = client.post("/api/demo/clear")
    assert clear_resp.status_code == 200
    assert clear_resp.json()["remaining_real_records"] == 1

    dash_after = client.get("/api/dashboard").json()
    assert dash_after["real_records_count"] == 1
    assert dash_after["demo_records_count"] == 0
    assert dash_after["kpis"]["net_revenue"] == 2000.00


def test_dashboard_and_analysis_react_to_filters(client):
    """Verifies that all dashboard KPIs, charts, and intelligent alerts react to filter parameters."""
    client.post("/api/demo/load")

    full_dash = client.get("/api/dashboard").json()
    assert full_dash["has_data"] is True
    full_rev = full_dash["kpis"]["net_revenue"]
    assert full_rev > 0

    # Filter by specific category
    cat_dash = client.get("/api/dashboard", params={"category": "Cloud & Infraestrutura"}).json()
    assert cat_dash["has_data"] is True
    assert 0 < cat_dash["kpis"]["net_revenue"] < full_rev
    assert len(cat_dash["sales_by_category"]) == 1
    assert cat_dash["sales_by_category"][0]["category"] == "Cloud & Infraestrutura"

    # Filter by salesperson and region
    sp_dash = client.get("/api/dashboard", params={"salesperson": "Mariana Costa", "region": "Sudeste"}).json()
    assert sp_dash["has_data"] is True
    assert len(sp_dash["salesperson_performance"]) == 1
    assert sp_dash["salesperson_performance"][0]["salesperson"] == "Mariana Costa"

    # Intelligent analysis detects intentional scenarios in the demo dataset
    analysis = client.get("/api/analysis").json()
    assert analysis["has_data"] is True
    alert_categories = {a["category"] for a in analysis["alerts"]}
    assert "queda_produto" in alert_categories
    assert "crescimento_categoria" in alert_categories
    assert "margem_baixa" in alert_categories
    assert "vendedor_abaixo_media" in alert_categories
    assert "queda_periodo" in alert_categories


def test_assistant_queries_all_core_intents(client):
    """Tests natural language questions against the deterministic analytics engine."""
    client.post("/api/demo/load")

    questions_and_expected_intents = [
        ("Qual foi o faturamento deste mês?", "faturamento_periodo"),
        ("Qual produto vendeu mais?", "produto_mais_vendido"),
        ("Qual categoria apresentou maior crescimento?", "categoria_maior_crescimento"),
        ("Quais produtos tiveram queda nas vendas?", "produtos_em_queda"),
        ("Qual vendedor apresentou melhor desempenho?", "desempenho_vendedores"),
        ("Qual foi o ticket médio?", "ticket_medio"),
        ("Quais produtos possuem margem de lucro mais baixa?", "produtos_menor_margem"),
        ("O faturamento aumentou ou diminuiu em relação ao mês anterior?", "comparacao_periodos"),
        ("Por que meu faturamento caiu?", "diagnostico_queda_faturamento"),
        ("Quais pontos merecem atenção?", "pontos_de_atencao"),
    ]

    for question, expected_intent in questions_and_expected_intents:
        resp = client.post("/api/assistant/query", json={"question": question})
        assert resp.status_code == 200
        body = resp.json()
        assert body["intent"] == expected_intent
        assert body["sufficient_data"] is True
        assert body["mode"] == "deterministic"
        assert len(body["answer"]) > 20
        assert isinstance(body["calculated_indicators"], dict)
        assert len(body["calculated_indicators"]) > 0


def test_assistant_insufficient_data_response(client):
    """Verifies that the assistant clearly informs when there is no data or no records match filters."""
    client.post("/api/demo/clear")

    resp = client.post("/api/assistant/query", json={"question": "Qual foi o faturamento deste mês?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["sufficient_data"] is False
    assert "Não há dados suficientes" in body["answer"]


def test_assistant_fallback_without_ai_api_key(client):
    """
    Verifies that selecting OpenAI or Gemini without an API key does NOT break the app
    and does NOT fake an LLM response, returning mode='fallback_deterministic'.
    """
    client.post("/api/demo/load")
    client.put("/api/settings", json={"ai_provider": "openai", "openai_api_key": ""})

    resp = client.post("/api/assistant/query", json={"question": "Qual foi o ticket médio?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["sufficient_data"] is True
    assert body["mode"] == "fallback_deterministic"
    assert "nenhuma chave de API foi configurada" in body["provider_status"]


def test_reports_csv_and_pdf_exports(client):
    """Verifies executive report JSON, CSV export, and PDF export."""
    client.post("/api/demo/load")

    rep_json = client.get("/api/reports/executive").json()
    assert rep_json["kpis"]["net_revenue"] > 0
    assert len(rep_json["recommendations"]) > 0

    csv_resp = client.get("/api/reports/export/csv")
    assert csv_resp.status_code == 200
    assert "SALESPILOT AI - RELATORIO EXECUTIVO DE VENDAS" in csv_resp.text

    pdf_resp = client.get("/api/reports/export/pdf")
    assert pdf_resp.status_code == 200
    assert pdf_resp.content.startswith(b"%PDF")
