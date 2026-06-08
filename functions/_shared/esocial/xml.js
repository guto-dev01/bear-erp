'use strict';

/**
 * Helper mínimo de construção de XML com escaping correto. Evita dependência
 * pesada de builder e garante que dados (nomes, valores) sejam escapados.
 *
 * Os eventos do eSocial têm estrutura fixa por leiaute; aqui montamos a árvore
 * de forma determinística (sem espaços/indentação que atrapalhem a C14N da
 * assinatura).
 */

function escaparTexto(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escaparAttr(v) {
  return escaparTexto(v).replace(/"/g, '&quot;');
}

/**
 * Convenção (sem ambiguidade entre XML e texto):
 *  - children ARRAY            → sub-árvore: concatena fragmentos XML (já montados
 *                                por outras chamadas de el()); filtra vazios.
 *  - children string/number    → folha de texto (SEMPRE escapado).
 *  - children undefined/null   → elemento omitido inteiramente (campo opcional).
 *
 * @param {string} nome
 * @param {object} [attrs]  atributos { chave: valor } (valores escapados)
 * @param {Array|string|number} [children]
 * @returns {string} '' quando o conteúdo é null/undefined
 */
function el(nome, attrs, children) {
  // Permite chamar el(nome, children) sem attrs.
  if (children === undefined && (typeof attrs !== 'object' || attrs === null || Array.isArray(attrs))) {
    children = attrs;
    attrs = undefined;
  }
  if (children === undefined || children === null) return '';

  const attrStr = attrs
    ? Object.entries(attrs)
        .filter(([, val]) => val !== undefined && val !== null)
        .map(([k, val]) => ` ${k}="${escaparAttr(val)}"`)
        .join('')
    : '';

  const inner = Array.isArray(children)
    ? children.filter((c) => c !== undefined && c !== null && c !== '').join('')
    : escaparTexto(children);

  return `<${nome}${attrStr}>${inner}</${nome}>`;
}

module.exports = { el, escaparTexto, escaparAttr };
