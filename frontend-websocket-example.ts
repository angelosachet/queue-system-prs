// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: 'QUEUE_UPDATE' | 'TIMED_QUEUE_UPDATE' | 'PLAYER_UPDATE';
  simulatorId?: number;
  data?: any;
}

interface UseWebSocketProps {
  onQueueUpdate?: (simulatorId: number, data?: any) => void;
  onTimedQueueUpdate?: (simulatorId: number, data?: any) => void;
  onPlayerUpdate?: (data?: any) => void;
}

export const useWebSocket = ({ 
  onQueueUpdate, 
  onTimedQueueUpdate, 
  onPlayerUpdate 
}: UseWebSocketProps) => {
  const ws = useRef<WebSocket>();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      ws.current = new WebSocket('ws://localhost:8080');
      
      ws.current.onopen = () => {
        console.log('WebSocket connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'QUEUE_UPDATE':
              if (message.simulatorId && onQueueUpdate) {
                onQueueUpdate(message.simulatorId, message.data);
              }
              break;
            case 'TIMED_QUEUE_UPDATE':
              if (message.simulatorId && onTimedQueueUpdate) {
                onTimedQueueUpdate(message.simulatorId, message.data);
              }
              break;
            case 'PLAYER_UPDATE':
              if (onPlayerUpdate) {
                onPlayerUpdate(message.data);
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        if (event.code !== 1000) {
          console.log('WebSocket error, falling back to polling');
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error, falling back to polling');
        if (ws.current) {
          ws.current.close();
        }
      };
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [onQueueUpdate, onTimedQueueUpdate, onPlayerUpdate]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN
  };
};

// Usage example in component:
/*
const QueueComponent = () => {
  const [queues, setQueues] = useState([]);
  
  const loadQueues = useCallback(async () => {
    const response = await fetch('http://localhost:3000/queue');
    const data = await response.json();
    setQueues(data);
  }, []);

  // Replace polling with WebSocket (connects to ws://localhost:8080)
  const { isConnected } = useWebSocket({
    onQueueUpdate: (simulatorId) => {
      console.log(`Queue updated for simulator ${simulatorId}`);
      loadQueues(); // Reload data when queue changes
    },
    onTimedQueueUpdate: (simulatorId) => {
      console.log(`Timed queue updated for simulator ${simulatorId}`);
      loadQueues();
    }
  });

  useEffect(() => {
    loadQueues(); // Initial load
  }, [loadQueues]);

  return (
    <div>
      <div>WebSocket: {isConnected ? 'Connected' : 'Disconnected'}</div>
      {queues.map(queue => (
        <div key={queue.id}>{queue.name}</div>
      ))}
    </div>
  );
};
*/