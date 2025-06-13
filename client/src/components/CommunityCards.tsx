import type { Card } from "../services/websocket";

interface CommunityCardsProps {
  cards?: Card[];
  gameStatus?: string;
}

export default function CommunityCards({ cards = [], gameStatus = "waiting" }: CommunityCardsProps) {
  // 只在游戏进行中时显示公共牌区域
  if (gameStatus === "waiting") {
    return null;
  }

  return (
    <div className="community-cards">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="poker-card empty-card" key={i}>
          {cards[i] ? (
            <div className="card-content">
              <div className="card-rank">{cards[i].rank}</div>
              <div className={`card-suit ${cards[i].suit}`}>
                {getSuitSymbol(cards[i].suit)}
              </div>
            </div>
          ) : (
            <div className="card-placeholder">?</div>
          )}
        </div>
      ))}
    </div>
  );
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