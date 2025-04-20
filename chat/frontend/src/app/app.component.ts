import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { WebSocketService } from './websocket.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;
  
  title = 'Chat Application';
  chatForm: FormGroup;
  messages: any[] = [];
  username: string = '';
  historyLoaded: boolean = false;
  
  constructor(
    private webSocketService: WebSocketService,
    private formBuilder: FormBuilder
  ) {
    this.chatForm = this.formBuilder.group({
      message: ['', Validators.required]
    });
  }
  
  ngOnInit() 
  {
    this.username = prompt('Please enter your username:') || 'Anonymous';
    
    this.webSocketService.connect();
    
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
        
        if (!isDuplicate || isSystemMessage) 
        {
          const newMessage = {
            username: messageObj.username,
            text: messageObj.message,
            timestamp: new Date(messageObj.timestamp),
            fromHistory: this.historyLoaded === false, // Marchează ca fiind din istorie dacă încă nu s-a încărcat istoricul complet
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
    });
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
  
  loadHistory() 
  {
    console.log('Loading message history...');
    
    this.messages = [];
    this.historyLoaded = false; // Reset starea istoricului
    
    this.webSocketService.requestHistory();
    
    setTimeout(() => {
      console.log('Setting historyLoaded=true with', this.messages.length, 'messages');
      this.historyLoaded = true;
      
      if (this.messages.length === 0) 
      {
        console.log('No messages in history');
        this.messages.push({
          username: 'System',
          text: 'No message history available. Start a new conversation!',
          timestamp: new Date(),
          fromHistory: false,
          systemMessage: true
        });
      }
      
      // Scroll la ultimul mesaj după ce se încărcă istoricul
      setTimeout(() => this.scrollToBottom(), 100);
    }, 1500);
  }
  
  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { 
      console.error('Eroare la scroll:', err);
    }
  }
}
