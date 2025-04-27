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
  
  constructor() {
    console.log('WebSocket Service initialized with URL:', this.wsUrl);
  }
  
  public connect(): void {
    console.log('Attempting to connect to WebSocket at:', this.wsUrl);
    this.socket = new WebSocket(this.wsUrl);
    
    this.socket.onopen = (event) => {
      console.log('WebSocket connection established successfully');
      console.log('Connection details:', {
        url: this.wsUrl,
        protocol: this.socket.protocol,
        readyState: this.socket.readyState
      });
    };
    
    this.socket.onmessage = (event) => {
      console.log('Message received:', event.data);
      this.messagesSubject.next(event.data);
    };
    
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.error('Connection details at error:', {
        url: this.wsUrl,
        readyState: this.socket.readyState
      });
    };
    
    this.socket.onclose = (event) => {
      console.log('WebSocket connection closed:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });
      // Încercăm reconectarea după o întârziere
      setTimeout(() => {
        console.log('Attempting to reconnect...');
        this.connect();
      }, 5000);
    };
  }
  
  public sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      this.socket.send(message);
    } else {
      console.error('WebSocket not connected. Current state:', this.socket?.readyState);
    }
  }
  
  // Metodă pentru a solicita istoricul mesajelor de la server
  public requestHistory(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Requesting message history...');
      const historyRequest = JSON.stringify({
        type: 'HISTORY_REQUEST'
      });
      this.socket.send(historyRequest);
    } else {
      console.error('WebSocket not connected for history request. Current state:', this.socket?.readyState);
      this.connect();
      setTimeout(() => this.requestHistory(), 1000);
    }
  }
  
  public getMessages(): Observable<string> {
    return this.messagesSubject.asObservable();
  }
  
  public disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.close();
    }
  }
}
