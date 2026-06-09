import { Injectable } from '@angular/core';
import { Account, Client, Databases, ID, Models, Query } from 'appwrite';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private account_: Account;
  private readonly dbId = environment.appwrite.databaseId;

  constructor() {
    this.client = new Client()
      .setEndpoint(environment.appwrite.endpoint)
      .setProject(environment.appwrite.projectId);
    this.databases = new Databases(this.client);
    this.account_ = new Account(this.client);
  }

  /** Account API do Appwrite (autenticação por sessão). */
  get account(): Account {
    return this.account_;
  }

  // ── Database ────────────────────────────────────────────────
  listDocuments<T>(collectionId: string, queries: string[] = []): Observable<T[]> {
    return from(this.databases.listDocuments(this.dbId, collectionId, queries)).pipe(
      map(res => res.documents as T[])
    );
  }

  getDocument<T>(collectionId: string, documentId: string): Observable<T> {
    return from(this.databases.getDocument(this.dbId, collectionId, documentId)) as Observable<T>;
  }

  createDocument<T>(collectionId: string, data: Record<string, unknown>, documentId?: string): Observable<T> {
    return from(this.databases.createDocument(this.dbId, collectionId, documentId || ID.unique(), data)) as Observable<T>;
  }

  updateDocument<T>(collectionId: string, documentId: string, data: Record<string, unknown>): Observable<T> {
    return from(this.databases.updateDocument(this.dbId, collectionId, documentId, data)) as Observable<T>;
  }

  deleteDocument(collectionId: string, documentId: string): Observable<unknown> {
    return from(this.databases.deleteDocument(this.dbId, collectionId, documentId));
  }

  // ── Auth (Appwrite Account) ─────────────────────────────────
  createSession(email: string, password: string): Observable<Models.Session> {
    return from(this.account_.createEmailPasswordSession(email, password));
  }

  getAccount(): Observable<Models.User<Models.Preferences>> {
    return from(this.account_.get());
  }

  deleteCurrentSession(): Observable<unknown> {
    return from(this.account_.deleteSession('current'));
  }

  createAccount(email: string, password: string, name: string): Observable<Models.User<Models.Preferences>> {
    return from(this.account_.create(ID.unique(), email, password, name));
  }

  query = Query;
}
