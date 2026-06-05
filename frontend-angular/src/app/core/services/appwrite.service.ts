import { Injectable } from '@angular/core';
import { Client, Databases, Query } from 'appwrite';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private readonly dbId = '69b52c820006ab36b33a';

  constructor() {
    this.client = new Client()
      .setEndpoint('https://cloud.appwrite.io/v1')
      .setProject('69b52c570036d92459ce');
    this.databases = new Databases(this.client);
  }

  listDocuments<T>(collectionId: string, queries: string[] = []): Observable<T[]> {
    return from(this.databases.listDocuments(this.dbId, collectionId, queries)).pipe(
      map(res => res.documents as T[])
    );
  }

  getDocument<T>(collectionId: string, documentId: string): Observable<T> {
    return from(this.databases.getDocument(this.dbId, collectionId, documentId)) as Observable<T>;
  }

  createDocument<T>(collectionId: string, data: Record<string, unknown>, documentId?: string): Observable<T> {
    const id = documentId || 'unique()';
    return from(this.databases.createDocument(this.dbId, collectionId, id, data)) as Observable<T>;
  }

  updateDocument<T>(collectionId: string, documentId: string, data: Record<string, unknown>): Observable<T> {
    return from(this.databases.updateDocument(this.dbId, collectionId, documentId, data)) as Observable<T>;
  }

  deleteDocument(collectionId: string, documentId: string): Observable<unknown> {
    return from(this.databases.deleteDocument(this.dbId, collectionId, documentId));
  }

  query = Query;
}
