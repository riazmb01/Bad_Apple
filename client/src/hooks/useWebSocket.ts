import { useEffect, useRef, useState } from "react";

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const messageQueue = useRef<string[]>([]);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setConnectionState('connected');
      // Send queued messages
      messageQueue.current.forEach(message => {
        ws.send(message);
      });
      messageQueue.current = [];
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        setLastMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnectionState('disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnectionState('disconnected');
    };

    setSocket(ws);
    setConnectionState('connecting');

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (message: WebSocketMessage) => {
    const messageString = JSON.stringify(message);
    
    console.log('[WEBSOCKET] sendMessage called:', { message, connectionState, hasSocket: !!socket });
    
    if (socket && connectionState === 'connected') {
      console.log('[WEBSOCKET] Sending message via connected socket');
      socket.send(messageString);
    } else {
      console.log('[WEBSOCKET] Queueing message - not connected yet');
      // Queue message for when connection is established
      messageQueue.current.push(messageString);
    }
  };

  return {
    socket,
    connectionState,
    lastMessage,
    sendMessage
  };
}
