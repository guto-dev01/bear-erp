"""CLI de desenvolvimento para o módulo fiscal_sefaz.

Exemplos:
  # Inspecionar um certificado A1 (não envia nada para a SEFAZ):
  python -m fiscal_sefaz.cli inspect --pfx empresa.pfx --senha "***" --cnpj-empresa 12345678000199

  # Consulta REAL ao NFeDistribuicaoDFe (exige A1 válido + acesso à SEFAZ):
  python -m fiscal_sefaz.cli sync --pfx empresa.pfx --senha "***" \
      --cnpj 12345678000199 --uf SP --ambiente homologacao --ult-nsu 0

A senha nunca é ecoada. Saída em JSON (sem segredos).
"""

from __future__ import annotations

import argparse
import json
import sys

from . import certificado
from .config import Ambiente
from .distribuicao import consultar_distribuicao
from .errors import SefazError


def _cmd_inspect(args) -> int:
    with open(args.pfx, "rb") as fh:
        pfx = fh.read()
    try:
        info = certificado.inspecionar(pfx, args.senha, cnpj_empresa=args.cnpj_empresa)
    except SefazError as exc:
        print(json.dumps({"ok": False, "erro": exc.mensagem_usuario, "detalhe": exc.detalhe}, ensure_ascii=False))
        return 1
    print(json.dumps({"ok": True, **info.to_public_dict()}, ensure_ascii=False, indent=2))
    return 0


def _cmd_sync(args) -> int:
    with open(args.pfx, "rb") as fh:
        pfx = fh.read()
    try:
        resultado = consultar_distribuicao(
            cnpj=args.cnpj,
            uf=args.uf,
            ambiente=Ambiente.from_str(args.ambiente),
            ult_nsu=args.ult_nsu,
            pfx_bytes=pfx,
            senha=args.senha,
            cnpj_empresa=args.cnpj_empresa or args.cnpj,
            timeout=args.timeout,
        )
    except SefazError as exc:
        print(json.dumps({"ok": False, "erro": exc.mensagem_usuario, "detalhe": exc.detalhe}, ensure_ascii=False))
        return 1

    saida = {
        "ok": True,
        **resultado.resumo(),
        "documentos_detalhe": [d.to_public_dict() for d in resultado.documentos],
    }
    print(json.dumps(saida, ensure_ascii=False, indent=2))
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="fiscal_sefaz", description="Integração NFeDistribuicaoDFe (SEFAZ).")
    sub = p.add_subparsers(dest="cmd", required=True)

    ins = sub.add_parser("inspect", help="Valida um certificado A1 e mostra os metadados.")
    ins.add_argument("--pfx", required=True, help="Caminho do .pfx/.p12")
    ins.add_argument("--senha", required=True)
    ins.add_argument("--cnpj-empresa", default=None, help="Valida compatibilidade de CNPJ.")
    ins.set_defaults(func=_cmd_inspect)

    syn = sub.add_parser("sync", help="Consulta REAL ao NFeDistribuicaoDFe.")
    syn.add_argument("--pfx", required=True)
    syn.add_argument("--senha", required=True)
    syn.add_argument("--cnpj", required=True, help="CNPJ autor (14 dígitos).")
    syn.add_argument("--uf", required=True, help="Sigla da UF (cUFAutor).")
    syn.add_argument("--ambiente", default="homologacao", choices=["producao", "homologacao"])
    syn.add_argument("--ult-nsu", default="0", help="Último NSU consultado (0 = primeira sync).")
    syn.add_argument("--cnpj-empresa", default=None)
    syn.add_argument("--timeout", type=int, default=60)
    syn.set_defaults(func=_cmd_sync)
    return p


def main(argv=None) -> int:
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
