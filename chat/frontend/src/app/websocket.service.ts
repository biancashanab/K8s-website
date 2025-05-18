import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: WebSocket;
  private messagesSubject = new Subject<string>();
  private connectionStatus = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  
  // Use dynamic WebSocket URL
  private wsUrl = "http://localhost:88/chat";
  
  constructor() {
    console.log('WebSocket Service initialized with URL:', this.wsUrl);
  }
  
  public connect(): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }
    
    console.log('Attempting to connect to WebSocket at:', this.wsUrl);
    
    try {
      this.socket = new WebSocket(this.wsUrl);
      
      this.socket.onopen = (event) => {
        console.log('WebSocket connection established successfully');
        this.connectionStatus.next(true);
        this.reconnectAttempts = 0;
      };
      
      this.socket.onmessage = (event) => {
        console.log('Message received:', event.data);
        this.messagesSubject.next(event.data);
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('Connection details at error:', {
          url: this.wsUrl,
          readyState: this.socket?.readyState
        });
      };
      
      this.socket.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        this.connectionStatus.next(false);
        
        // Attempt to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const timeout = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Attempting to reconnect in ${timeout}ms (attempt ${this.reconnectAttempts})`);
          
          setTimeout(() => {
            this.connect();
          }, timeout);
        } else {
          console.error('Maximum reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
    }
  }
  
  public sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message);
      this.socket.send(message);
    } else {
      console.error('WebSocket not connected. Current state:', this.socket?.readyState);
      // Queue message to be sent when connection is established
      this.connect();
      setTimeout(() => this.sendMessage(message), 1000);
    }
  }
  
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
  
  public getConnectionStatus(): Observable<boolean> {
    return this.connectionStatus.asObservable();
  }
  
  public disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.close();
    }
  }
  
  public reconnect(): void {
    this.disconnect();
    this.reconnectAttempts = 0;
    this.connect();
  }
}
