import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: WebSocket;
  private messagesSubject = new Subject<string>();
  
  // WebSocket URL este preluat din configurație
  private wsUrl = environment.wsUrl;
  
  constructor() { }
  
  public connect(): void {
    this.socket = new WebSocket(this.wsUrl);
    
    this.socket.onopen = (event) => {
      console.log('Conexiune WebSocket stabilită');
    };
    
    this.socket.onmessage = (event) => {
      console.log('Mesaj primit:', event.data);
      this.messagesSubject.next(event.data);
    };
    
    this.socket.onerror = (error) => {
      console.error('Eroare WebSocket:', error);
    };
    
    this.socket.onclose = (event) => {
      console.log('Conexiune WebSocket închisă:', event);
      // Încercăm reconectarea după o întârziere
      setTimeout(() => {
        this.connect();
      }, 5000);
    };
  }
  
  public sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      console.error('WebSocket nu este conectat');
    }
  }
  
  // Metodă pentru a solicita istoricul mesajelor de la server
  public requestHistory(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Trimitem un mesaj special pentru a cere istoricul
      const historyRequest = JSON.stringify({
        type: 'HISTORY_REQUEST'
      });
      this.socket.send(historyRequest);
    } else {
      console.error('WebSocket nu este conectat');
      // Încearcăm să ne reconectăm și apoi să cerem istoricul
      this.connect();
      setTimeout(() => this.requestHistory(), 1000);
    }
  }
  
  public getMessages(): Observable<string> {
    return this.messagesSubject.asObservable();
  }
  
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
