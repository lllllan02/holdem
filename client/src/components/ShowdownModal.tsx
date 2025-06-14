import { type Player as WSPlayer, getHandName } from '../services/websocket';

interface ShowdownModalProps {
  players: WSPlayer[];
  pot: number;
  onClose: () => void;
  onReady: () => void;
  communityCards?: { suit: string; rank: string }[];
}

export default function ShowdownModal({ players, pot, onClose, communityCards, onReady }: ShowdownModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: '#1a1a1a',
      border: '2px solid #FFD700',
      borderRadius: '15px',
      padding: '20px',
      minWidth: '400px',
      maxWidth: '600px',
      zIndex: 1000,
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '20px',
        fontSize: '24px',
        color: '#FFD700',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
      }}>
        🎉 摊牌结果 🎉
      </div>

      <div style={{
        color: '#4CAF50',
        marginBottom: '10px',
        textAlign: 'center'
      }}>
        底池总额: {pot} 筹码
      </div>

      {/* 公共牌显示 */}
      {communityCards && communityCards.length > 0 && (
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <h3 style={{
            color: '#ccc',
            fontSize: '16px',
            marginBottom: '15px'
          }}>
            公共牌
          </h3>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {communityCards.map((card, index) => (
              <div key={index} style={{
                width: '50px',
                height: '70px',
                background: 'white',
                border: '2px solid #333',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 3px 6px rgba(0,0,0,0.3)'
              }}>
                <div style={{ color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000' }}>
                  {card.rank}
                </div>
                <div style={{ 
                  color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000',
                  fontSize: '18px'
                }}>
                  {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {players.map((player, index) => {
          if (!player.name) return null;
          const winAmount = player.winAmount || 0;
          const totalBet = player.totalBet || 0;
          const netChange = winAmount - totalBet;

          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '15px',
              background: player.status === "folded" 
                ? "rgba(255, 255, 255, 0.05)" 
                : netChange > 0 
                  ? "rgba(76, 175, 80, 0.1)" 
                  : netChange < 0
                    ? "rgba(244, 67, 54, 0.1)"
                    : "rgba(255, 255, 255, 0.08)",
              borderRadius: '10px',
              border: netChange > 0 
                ? "1px solid #4CAF50"
                : netChange < 0
                  ? "1px solid #F44336"
                  : "1px solid #444"
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: netChange > 0 ? "#4CAF50" : netChange < 0 ? "#F44336" : "white",
                    minWidth: '100px'
                  }}>
                    {player.name}
                    {netChange > 0 && (
                      <div style={{
                        background: "#FFD700",
                        color: "#000",
                        borderRadius: "50%",
                        width: "20px",
                        height: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: "bold",
                        border: "2px solid #FFA500",
                        boxShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
                      }}>
                        🏆
                      </div>
                    )}
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#888'
                    }}>
                      下注: {totalBet}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: netChange > 0 ? "#4CAF50" : netChange < 0 ? "#F44336" : "#888"
                    }}>
                      {netChange > 0 ? `+${netChange}` : netChange}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  {/* 显示玩家手牌 */}
                  {player.status !== "folded" && player.holeCards && player.holeCards.length > 0 && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '4px',
                    }}>
                      {player.holeCards.map((card, cardIndex) => (
                        <div key={cardIndex} style={{
                          width: '30px',
                          height: '42px',
                          background: 'white',
                          border: '1px solid #333',
                          borderRadius: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}>
                          <div style={{ 
                            color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000'
                          }}>
                            {card.rank}
                          </div>
                          <div style={{ 
                            color: (card.suit === 'hearts' || card.suit === 'diamonds') ? '#ff0000' : '#000000',
                            fontSize: '14px'
                          }}>
                            {card.suit === 'hearts' ? '♥' : card.suit === 'diamonds' ? '♦' : card.suit === 'clubs' ? '♣' : '♠'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {player.status === "folded" ? (
                    <div style={{
                      background: "rgba(255, 68, 68, 0.8)",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "15px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}>
                      已弃牌
                    </div>
                  ) : player.handRank && (
                    <div style={{
                      background: netChange > 0 ? "rgba(76, 175, 80, 0.8)" : "rgba(76, 175, 80, 0.6)",
                      color: "white",
                      padding: "4px 12px",
                      borderRadius: "15px",
                      fontSize: "14px",
                      fontWeight: "500"
                    }}>
                      {getHandName(player.handRank.rank)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'center',
        gap: '10px'
      }}>
        <button
          onClick={onReady}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          准备
        </button>
        <button
          onClick={onClose}
          style={{
            background: '#666',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          关闭
        </button>
      </div>
    </div>
  );
} 