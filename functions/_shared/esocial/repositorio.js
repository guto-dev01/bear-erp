'use strict';

/**
 * Repositório dos eventos do eSocial (coleção `eventos_esocial`).
 *
 * Abstrai a persistência para o orquestrador de transmissão ser testável sem
 * Appwrite. Dois adaptadores: Appwrite (produção) e memória (testes).
 */

/** Adaptador Appwrite. */
class AppwriteEventosRepo {
  /**
   * @param {object} deps
   * @param {object} deps.databases  node-appwrite Databases
   * @param {string} deps.dbId
   * @param {string} [deps.collection='eventos_esocial']
   */
  constructor({ databases, dbId, collection = 'eventos_esocial' }) {
    if (!databases || !dbId) throw new Error('AppwriteEventosRepo: databases e dbId obrigatórios');
    this._db = databases;
    this._dbId = dbId;
    this._col = collection;
  }

  async obter(id) {
    return this._db.getDocument(this._dbId, this._col, id);
  }

  async atualizar(id, patch) {
    return this._db.updateDocument(this._dbId, this._col, id, patch);
  }
}

/** Adaptador em memória (testes/dev). */
class MemoriaEventosRepo {
  /** @param {Record<string, object>} [docs] */
  constructor(docs = {}) {
    this._docs = new Map(Object.entries(docs));
  }

  async obter(id) {
    const d = this._docs.get(id);
    if (!d) throw new Error(`evento ${id} não encontrado`);
    return d;
  }

  async atualizar(id, patch) {
    const atual = this._docs.get(id) || { $id: id };
    const novo = { ...atual, ...patch };
    this._docs.set(id, novo);
    return novo;
  }
}

module.exports = { AppwriteEventosRepo, MemoriaEventosRepo };
