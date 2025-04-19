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
  
  ngOnInit() {
    // Ask for username when component initializes
    this.username = prompt('Please enter your username:') || 'Anonymous';
    
    // Connect to WebSocket
    this.webSocketService.connect();
    
    // Subscribe to incoming messages
    this.webSocketService.getMessages().subscribe(message => {
      try {
        console.log('Received message:', message);
        const messageObj = JSON.parse(message);
        
        // Verificăm dacă este un mesaj de sistem special
        const isSystemMessage = messageObj.systemMessage === true;
        
        // Verifică dacă mesajul este deja prezent în listă (să evităm duplicatele)
        const isDuplicate = this.messages.some(msg => 
          msg.username === messageObj.username && 
          msg.text === messageObj.message && 
          msg.timestamp && messageObj.timestamp &&
          msg.timestamp.getTime() === new Date(messageObj.timestamp).getTime()
        );
        
        // Procesăm mesajul doar dacă nu e duplicat sau dacă e mesaj de sistem
        if (!isDuplicate || isSystemMessage) {
          // Adăugăm mesajul cu o proprietate care indică dacă provine din istorie
          const newMessage = {
            username: messageObj.username,
            text: messageObj.message,
            timestamp: new Date(messageObj.timestamp),
            fromHistory: this.historyLoaded === false, // Marchează ca fiind din istorie dacă încă nu s-a încărcat istoricul complet
            systemMessage: isSystemMessage
          };
          
          console.log('Adding message to display:', newMessage);
          this.messages.push(newMessage);
          
          // Scroll la ultimul mesaj doar pentru mesaje noi, nu la încărcarea istoricului
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
  
  // Funcție pentru a încărca mesajele vechi din baza de date
  loadHistory() {
    console.log('Loading message history...');
    
    // Eliminăm mesajele existente pentru a evita duplicatele când reîncărcăm
    this.messages = [];
    this.historyLoaded = false; // Reset starea istoricului
    
    // Solicităm serverului să retrimită istoricul
    this.webSocketService.requestHistory();
    
    // Marăcm faptul că istoricul a fost încărcat cu un timeout mai lung
    // pentru a ne asigura că toate mesajele au sosit
    setTimeout(() => {
      console.log('Setting historyLoaded=true with', this.messages.length, 'messages');
      this.historyLoaded = true;
      
      // Verificăm dacă avem mesaje în istoric
      if (this.messages.length === 0) {
        console.log('No messages in history');
        // Adaugăm un mesaj de sistem pentru a informa utilizatorul
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
    }, 1500); // Timp mai lung pentru a ne asigura că mesajele au sosit
  }
  
  // Funcție pentru a derula automat la cel mai recent mesaj
  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { 
      console.error('Eroare la scroll:', err);
    }
  }
}
