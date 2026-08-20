"""Testes da camada HTTP (api.py) — rotas que não tocam a SEFAZ.

Cobrem a raiz e o /health: são justamente as rotas que o Render usa (health
check) e a que o navegador abre na URL pública. A ausência de `GET /` fazia a
raiz responder o 404 padrão do FastAPI, o que parecia serviço fora do ar.
"""

from fastapi.testclient import TestClient

from fiscal_sefaz.api import app

cliente = TestClient(app)


def test_raiz_responde_200_e_nao_404():
    resposta = cliente.get("/")
    assert resposta.status_code == 200
    corpo = resposta.json()
    assert corpo["servico"] == "fiscal_sefaz"
    assert corpo["docs"] == "/docs"


def test_raiz_lista_os_endpoints_reais():
    endpoints = cliente.get("/").json()["endpoints"]
    assert endpoints == ["/health", "/sefaz/testar-certificado", "/sefaz/sincronizar"]
    rotas = {r.path for r in app.routes}
    for endpoint in endpoints:
        assert endpoint in rotas, f"{endpoint} anunciado na raiz mas não registrado"


def test_health_continua_ok():
    resposta = cliente.get("/health")
    assert resposta.status_code == 200
    assert resposta.json()["ok"] is True
