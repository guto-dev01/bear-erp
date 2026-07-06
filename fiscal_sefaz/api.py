"""Serviço HTTP (FastAPI) que expõe o worker fiscal_sefaz ao frontend.

É a ponte entre o Angular (navegador) e a integração SOAP/mTLS com a SEFAZ:
o navegador NÃO faz SOAP — ele chama este serviço, que executa a consulta real.

Endpoints:
  GET  /health
  POST /sefaz/testar-certificado   (multipart: pfx, senha, [cnpj_empresa])
  POST /sefaz/sincronizar          (multipart: pfx, senha, cnpj, uf, ambiente, ult_nsu)

Segurança:
  * pfx e senha trafegam apenas nesta requisição, ficam só em memória e NUNCA
    são logados nem persistidos aqui;
  * respostas usam somente dicts "públicos" (sem senha/chave);
  * CORS: app local (localhost/LAN :4200) sempre liberado; origens extras
    (frontend hospedado) via env CORS_ORIGINS, separadas por vírgula.

Rodar local:
  uvicorn fiscal_sefaz.api:app --host 127.0.0.1 --port 8770

Rodar hospedado (Render — ver render.yaml na raiz do repo):
  uvicorn fiscal_sefaz.api:app --host 0.0.0.0 --port $PORT
"""

from __future__ import annotations

import os

from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import certificado
from .config import Ambiente, origens_cors
from .distribuicao import consultar_distribuicao
from .errors import SefazError

app = FastAPI(title="Bear ERP — Worker SEFAZ (NFeDistribuicaoDFe)", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origens_cors(os.environ.get("CORS_ORIGINS")),
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):4200",
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True, "servico": "fiscal_sefaz", "versao": app.version}


@app.post("/sefaz/testar-certificado")
async def testar_certificado(
    pfx: UploadFile = File(...),
    senha: str = Form(...),
    cnpj_empresa: str | None = Form(None),
):
    conteudo = await pfx.read()
    try:
        info = certificado.inspecionar(conteudo, senha, cnpj_empresa=cnpj_empresa)
    except SefazError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "erro": exc.mensagem_usuario, "detalhe": exc.detalhe})
    return {"ok": True, **info.to_public_dict()}


@app.post("/sefaz/sincronizar")
async def sincronizar(
    pfx: UploadFile = File(...),
    senha: str = Form(...),
    cnpj: str = Form(...),
    uf: str = Form(...),
    ambiente: str = Form("homologacao"),
    ult_nsu: str = Form("0"),
    cnpj_empresa: str | None = Form(None),
):
    conteudo = await pfx.read()
    try:
        resultado = consultar_distribuicao(
            cnpj=cnpj,
            uf=uf,
            ambiente=Ambiente.from_str(ambiente),
            ult_nsu=ult_nsu,
            pfx_bytes=conteudo,
            senha=senha,
            cnpj_empresa=cnpj_empresa or cnpj,
        )
    except SefazError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "erro": exc.mensagem_usuario, "detalhe": exc.detalhe})
    except ValueError as exc:
        return JSONResponse(status_code=422, content={"ok": False, "erro": "Parâmetros inválidos.", "detalhe": str(exc)})

    return {
        "ok": True,
        **resultado.resumo(),
        "motivo": resultado.motivo,
        "documentos": [d.to_public_dict() for d in resultado.documentos],
    }
