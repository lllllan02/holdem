import type { Card } from "../services/websocket";

interface CommunityCardsProps {
  cards?: Card[];
  gameStatus?: string;
}

// 获取花色符号
function getSuitSymbol(suit: string): string {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    default: return '';
  }
}

// 获取花色颜色
function getSuitColor(suit: string): string {
  return (suit === 'hearts' || suit === 'diamonds') ? '#ff0000' : '#000000';
}

export default function CommunityCards({ cards = [], gameStatus = "waiting" }: CommunityCardsProps) {
  // 只在游戏进行中时显示公共牌区域
  if (gameStatus === "waiting") {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      gap: '20px',
      padding: '20px',
    }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            width: '56px',
            height: '80px',
            background: cards[i]?.suit ? 'white' : 'rgba(45, 55, 72, 0.8)',
            border: cards[i]?.suit ? '1px solid rgba(0, 0, 0, 0.1)' : '1px solid rgba(74, 85, 104, 0.2)',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 'bold',
            boxShadow: cards[i]?.suit 
              ? '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)' 
              : '0 4px 6px rgba(0, 0, 0, 0.2)',
          }}
        >
          {cards[i]?.suit ? (
            <>
              <div style={{ color: getSuitColor(cards[i].suit) }}>
                {cards[i].rank}
              </div>
              <div style={{ color: getSuitColor(cards[i].suit), fontSize: '24px' }}>
                {getSuitSymbol(cards[i].suit)}
              </div>
            </>
          ) : (
            <div style={{ color: 'rgba(160, 174, 192, 0.8)', fontSize: '28px' }}>?</div>
          )}
        </div>
      ))}
    </div>
  );
} 