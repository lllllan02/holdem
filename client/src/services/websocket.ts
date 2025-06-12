class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;

    private constructor() {
        this.connect();
    }

    public static getInstance(): WebSocketService {
        if (!WebSocketService.instance) {
            WebSocketService.instance = new WebSocketService();
        }
        return WebSocketService.instance;
    }

    private connect() {
        if (this.ws?.readyState === WebSocket.OPEN) return;

        const wsUrl = `ws://${window.location.hostname}:8080/ws`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => console.log('WebSocket connected');
        this.ws.onclose = () => console.log('WebSocket closed');
        this.ws.onerror = (error) => console.error('WebSocket error:', error);
        this.ws.onmessage = (event) => console.log('Message:', event.data);
    }
}

export const wsService = WebSocketService.getInstance(); 