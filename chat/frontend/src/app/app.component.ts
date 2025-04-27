import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  title = 'Chat Application';
  chatForm: FormGroup;
  messages: any[] = [];
  username: string = '';
  historyLoaded: boolean = false;
  isConnected: boolean = false;
  private subscriptions: Subscription[] = [];
  
  constructor(
    private webSocketService: WebSocketService,
    private formBuilder: FormBuilder
  ) {
    this.chatForm = this.formBuilder.group({
      message: ['', Validators.required]
    });
  }
  
  ngOnInit() {
    // Get username with a simple fallback
    this.username = prompt('Please enter your username:') || 'Anonymous';
    
    // Initialize WebSocket connection
    this.webSocketService.connect();
    
    // Subscribe to connection status
    this.subscriptions.push(
      this.webSocketService.getConnectionStatus().subscribe(status => {
        this.isConnected = status;
        console.log('WebSocket connection status:', status);
        
        // If newly connected, request history
        if (status && this.messages.length === 0) {
          this.loadHistory();
        }
      })
    );
    
    // Subscribe to incoming messages
    this.subscriptions.push(
      this.webSocketService.getMessages().subscribe(message => {
        try {
          console.log('Received message:', message);
          const messageObj = JSON.parse(message);
          
          const isSystemMessage = messageObj.systemMessage === true;
          
          const isDuplicate = this.messages.some(msg => 
            msg.username === messageObj.username && 
            msg.text === messageObj.message && 
            msg.timestamp && messageObj.timestamp &&
            msg.timestamp.getTime() === new Date(messageObj.timestamp).getTime()
          );
          
          if (!isDuplicate || isSystemMessage) {
            const newMessage = {
              username: messageObj.username,
              text: messageObj.message,
              timestamp: new Date(messageObj.timestamp),
              fromHistory: !this.historyLoaded, // Mark as from history if history not yet fully loaded
              systemMessage: isSystemMessage
            };
            
            console.log('Adding message to display:', newMessage);
            this.messages.push(newMessage);
            
            if (!newMessage.fromHistory) {
              setTimeout(() => this.scrollToBottom(), 100);
            }
          } else {
            console.log('Skipping duplicate message:', messageObj);
          }
        } catch (error) {
          console.error('Error parsing message', error);
        }
      })
    );
  }
  
  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    // Disconnect WebSocket
    this.webSocketService.disconnect();
  }
  
  sendMessage() {
    if (this.chatForm.valid) {
      const message = {
        username: this.username,
        message: this.chatForm.value.message
      };
      
      this.webSocketService.sendMessage(JSON.stringify(message));
      this.chatForm.reset();
    }
  }
  
  loadHistory() {
    console.log('Loading message history...');
    
    this.messages = [];
    this.historyLoaded = false; // Reset history state
    
    this.webSocketService.requestHistory();
    
    // Set a timeout to mark history as loaded and handle empty messages
    setTimeout(() => {
      console.log('Setting historyLoaded=true with', this.messages.length, 'messages');
      this.historyLoaded = true;
      
      if (this.messages.length === 0) {
        console.log('No messages in history');
        this.messages.push({
          username: 'System',
          text: 'No message history available. Start a new conversation!',
          timestamp: new Date(),
          fromHistory: false,
          systemMessage: true
        });
      }
      
      // Scroll to last message after history loads
      setTimeout(() => this.scrollToBottom(), 100);
    }, 1500);
  }
  
  reconnectWebSocket() {
    console.log('Manual reconnection requested');
    this.webSocketService.connect();
  }
  
  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { 
      console.error('Error scrolling to bottom:', err);
    }
  }
}