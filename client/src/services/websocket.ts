// WebSocket消息类型
export type MessageType = 
  | 'game_state'
  | 'player_action'
  | 'game_update'
  | 'error'
  | 'sit_down'
  | 'leave_seat'
  | 'start_game'
  | 'fold'
  | 'call'
  | 'raise'
  | 'check';

// WebSocket消息结构
export interface WSMessage {
  type: MessageType;
  data: any;
}

// 扑克牌类型
export interface Card {
  suit: string;  // 花色: hearts, diamonds, clubs, spades
  rank: string;  // 点数: 2-10, J, Q, K, A
  value: number; // 数值: 2-14 (A=14)
}

// 玩家类型
export interface Player {
  userId: string;
  name: string;
  status: string;
  chips: number;
  holeCards: Card[];    // 底牌
  currentBet: number;   // 当前轮下注额
  totalBet: number;     // 本局总下注额
  hasActed: boolean;    // 本轮是否已行动
}

// 游戏状态类型
export interface GameState {
  players: Player[];
  gameStatus: string;
  gamePhase: string;        // 当前游戏阶段
  communityCards: Card[];   // 公共牌
  pot: number;              // 底池
  currentBet: number;       // 当前下注额
  dealerPos: number;        // 庄家位置
  currentPlayer: number;    // 当前行动玩家
  smallBlind: number;       // 小盲注
  bigBlind: number;         // 大盲注
}

// 回调函数类型
type GameStateCallback = (gameState: GameState) => void;
type ErrorCallback = (error: string) => void;

class WebSocketService {
    private static instance: WebSocketService;
    private ws: WebSocket | null = null;
    private gameStateCallbacks: GameStateCallback[] = [];
    private errorCallbacks: ErrorCallback[] = [];

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

        this.ws.onopen = () => {
            console.log('WebSocket connected');
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            // 重连逻辑
            setTimeout(() => this.connect(), 3000);
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WSMessage = JSON.parse(event.data);
                this.handleMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };
    }

    private handleMessage(message: WSMessage) {
        console.log('Received message:', message);

        switch (message.type) {
            case 'game_state':
                this.gameStateCallbacks.forEach(callback => {
                    callback(message.data.game);
                });
                break;
            case 'error':
                this.errorCallbacks.forEach(callback => {
                    callback(message.data.message);
                });
                break;
            default:
                console.log('Unhandled message type:', message.type);
        }
    }

    // 注册游戏状态回调
    public onGameState(callback: GameStateCallback) {
        this.gameStateCallbacks.push(callback);
    }

    // 注册错误回调
    public onError(callback: ErrorCallback) {
        this.errorCallbacks.push(callback);
    }

    // 发送消息
    public sendMessage(type: MessageType, data: any) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            const message: WSMessage = { type, data };
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    // 发送落座消息
    public sitDown(seatId: number) {
        this.sendMessage('sit_down', { seatId });
    }

    // 发送离开座位消息
    public leaveSeat(seatId: number) {
        this.sendMessage('leave_seat', { seatId });
    }

    // 发送开始游戏消息
    public startGame() {
        this.sendMessage('start_game', {});
    }

    // 发送弃牌消息
    public fold() {
        this.sendMessage('fold', {});
    }

    // 发送跟注消息
    public call() {
        this.sendMessage('call', {});
    }

    // 发送过牌消息
    public check() {
        this.sendMessage('check', {});
    }

    // 发送加注消息
    public raise(amount: number) {
        this.sendMessage('raise', { amount });
    }
}

export const wsService = WebSocketService.getInstance(); 