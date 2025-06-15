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
  | 'check'
  | 'end_game'
  | 'ready'
  | 'unready';

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

// 牌型结构
export interface HandRank {
  rank: number;    // 牌型等级
  values: number[]; // 关键牌值
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
  handRank?: HandRank;  // 牌型（摊牌时显示）
  winAmount?: number;   // 本局赢得的金额
  isReady?: boolean;    // 是否已准备
}

// 对局记录中的玩家信息
export interface PlayerRoundInfo {
  userId: string;
  name: string;
  position: number;
  initChips: number;
  finalChips: number;
  totalBet: number;
  status: string;
  holeCards: Card[];
  handRank: string;
}

// 获胜者信息
export interface PlayerWinningInfo {
  userId: string;
  name: string;
  position: number;
  winAmount: number;
  handRank: string;
  holeCards: Card[];
}

// 对局记录
export interface GameRound {
  roundId: string;
  startTime: number;
  endTime: number;
  dealerPos: number;
  pot: number;
  communityCards: Card[];
  players: PlayerRoundInfo[];
  winners: PlayerWinningInfo[];
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
  countdownTimer: number;    // 倒计时（秒）
  spectators: number;        // 观众数量
  
  // 摊牌相关字段
  showdownOrder: number[];  // 摊牌顺序（玩家索引）
  currentShowdown: number;  // 当前摊牌的玩家索引
  showdownTimer: number;    // 摊牌倒计时

  // 对局记录
  currentRound?: GameRound; // 当前对局记录，用于结算展示
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

        // 使用相对路径，让 WebSocket 也通过 Vite 代理
        // 这样 HTTP API 和 WebSocket 请求都会有相同的源 IP
        const wsUrl = `ws://${window.location.host}/ws`;
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

    // 发送结束游戏消息
    public endGame() {
        this.sendMessage('end_game', {});
    }

    // 准备
    public ready() {
        this.sendMessage('ready', {});
    }

    // 取消准备
    public unready() {
        this.sendMessage('unready', {});
    }
}

// 获取牌型名称
export function getHandName(rank: number): string {
  switch (rank) {
    case 10: return "皇家同花顺";
    case 9: return "同花顺";
    case 8: return "四条";
    case 7: return "葫芦";
    case 6: return "同花";
    case 5: return "顺子";
    case 4: return "三条";
    case 3: return "两对";
    case 2: return "一对";
    case 1: return "高牌";
    default: return "未知";
  }
}

export const wsService = WebSocketService.getInstance(); 