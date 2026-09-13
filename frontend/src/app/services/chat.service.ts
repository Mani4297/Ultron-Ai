import { Injectable, signal, computed } from '@angular/core';
import { ChatMessage, SettingsState } from '../models/chat.model';
import { SpeechService } from './speech.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socket: WebSocket | null = null;
  private wsUrl = 'ws://127.0.0.1:8008/ws/chat';
  private apiUrl = 'http://127.0.0.1:8008/chat';

  // Signals
  public isConnected = signal<boolean>(false);
  public isStreaming = signal<boolean>(false);
  public messages = signal<ChatMessage[]>([]);
  public connectionError = signal<string | null>(null);
  public responseLanguage = signal<'en-US' | 'te-IN'>('en-US');

  // Settings
  public settings = signal<SettingsState>({
    voiceEnabled: true,
    typingDelay: 15,
    autoSpeak: true,
    systemVolume: 1.0
  });

  constructor(private speechService: SpeechService) {
    this.loadHistory();
    this.connectWebSocket();
  }

  public connectWebSocket(): void {
    if (typeof window === 'undefined') return;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.socket = new WebSocket(this.wsUrl);

      this.socket.onopen = () => {
        this.isConnected.set(true);
        this.connectionError.set(null);
      };

      this.socket.onmessage = (event) => {
        this.handleSocketMessage(event.data);
      };

      this.socket.onerror = () => {
        this.isConnected.set(false);
        this.connectionError.set('WebSocket link failure. Operating on neural fallback.');
      };

      this.socket.onclose = () => {
        this.isConnected.set(false);
        // Attempt reconnect after 3 seconds
        setTimeout(() => this.connectWebSocket(), 3000);
      };
    } catch (e: any) {
      this.isConnected.set(false);
      this.connectionError.set(`Failed to establish socket link: ${e.message}`);
    }
  }

  private handleSocketMessage(rawData: string): void {
    try {
      const data = JSON.parse(rawData);

      if (data.type === 'start') {
        this.isStreaming.set(true);
      } else if (data.type === 'chunk') {
        this.appendChunk(data.content);
      } else if (data.type === 'done') {
        this.finalizeMessage(data.content);
        this.isStreaming.set(false);
      } else if (data.type === 'error') {
        this.appendErrorMessage(data.message);
        this.isStreaming.set(false);
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  }

  public sendMessage(content: string): void {
    const trimmed = content.trim();
    if (!trimmed) return;

    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    };

    const currentMessages = this.messages();
    this.messages.set([...currentMessages, userMsg]);
    this.saveHistory();

    // Prepare assistant placeholder message
    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };
    this.messages.set([...this.messages(), assistantMsg]);

    // Format chat history for Gemini
    const historyPayload = currentMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10) // Send last 10 messages for context
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: m.content
      }));

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.isStreaming.set(true);
      this.socket.send(JSON.stringify({
        message: trimmed,
        history: historyPayload,
        language: this.responseLanguage()
      }));
    } else {
      // Fallback to HTTP POST /chat
      this.sendHttpFallback(trimmed, historyPayload, assistantMsgId);
    }
  }

  private async sendHttpFallback(text: string, history: any[], msgId: string): Promise<void> {
    try {
      this.isStreaming.set(true);
      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history, language: this.responseLanguage() })
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      this.finalizeMessage(data.response);
    } catch (e: any) {
      this.appendErrorMessage(`Neural Core Error: ${e.message}`);
    } finally {
      this.isStreaming.set(false);
    }
  }

  private appendChunk(chunk: string): void {
    const msgs = [...this.messages()];
    const lastIdx = msgs.length - 1;
    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
      msgs[lastIdx] = {
        ...msgs[lastIdx],
        content: msgs[lastIdx].content + chunk
      };
      this.messages.set(msgs);
    }
  }

  private finalizeMessage(fullText: string): void {
    const msgs = [...this.messages()];
    const lastIdx = msgs.length - 1;
    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
      msgs[lastIdx] = {
        ...msgs[lastIdx],
        content: fullText || msgs[lastIdx].content,
        isStreaming: false
      };
      this.messages.set(msgs);
      this.saveHistory();

      // Read aloud if voiceEnabled is active
      if (this.speechService.isHandsFree()) {
        if (this.settings().voiceEnabled && this.settings().autoSpeak) {
          this.speechService.speak(msgs[lastIdx].content, () => this.speechService.resumeHandsFree());
        } else {
          this.speechService.resumeHandsFree();
        }
      } else if (this.settings().voiceEnabled && this.settings().autoSpeak) {
        this.speechService.speak(msgs[lastIdx].content);
      }
    }
  }

  private appendErrorMessage(errorText: string): void {
    const msgs = [...this.messages()];
    const lastIdx = msgs.length - 1;
    if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
      msgs[lastIdx] = {
        ...msgs[lastIdx],
        content: `[ALERT] ${errorText}`,
        isStreaming: false
      };
      this.messages.set(msgs);
      this.saveHistory();
    }
  }

  public clearHistory(): void {
    this.messages.set([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ultron_chat_history');
    }
    this.speechService.stopSpeaking();
  }

  private saveHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('ultron_chat_history', JSON.stringify(this.messages()));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }

  private loadHistory(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('ultron_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.messages.set(parsed);
      }
    } catch (e) {
      console.warn('Could not load history from localStorage', e);
    }
  }

  public updateSettings(partial: Partial<SettingsState>): void {
    this.settings.set({
      ...this.settings(),
      ...partial
    });
  }

  public setResponseLanguage(language: 'en-US' | 'te-IN'): void {
    this.responseLanguage.set(language);
    this.speechService.setLanguage(language);
  }
}
