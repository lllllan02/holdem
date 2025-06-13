import React from 'react';
import CommunityCards from './CommunityCards';
import PlayerSeat from './PlayerSeat';

const SEAT_POSITIONS = [
  // 上方3人
  { x: 0.32, y: 0.09, seat: '上1' },
  { x: 0.50, y: 0.09, seat: '上2' },
  { x: 0.68, y: 0.09, seat: '上3' },
  // 右2人
  { x: 0.93, y: 0.32, seat: '右1' },
  { x: 0.93, y: 0.68, seat: '右2' },
  // 下方自己
  { x: 0.50, y: 0.93, seat: '自己' },
  // 左2人
  { x: 0.07, y: 0.32, seat: '左1' },
  { x: 0.07, y: 0.68, seat: '左2' },
];

// 扑克牌组件
function PokerHand({ cards = [] }: { cards: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {cards.map((c, i) => (
        <div key={i} style={{
          width: 28, height: 38, background: '#fff', borderRadius: 4, border: '2px solid #FFD700',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16, color: '#222',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)'
        }}>{c}</div>
      ))}
    </div>
  );
}

export default function PokerTable({
  players = [],
  communityCards = [],
}: {
  players?: { name: string; chips: number }[];
  communityCards?: string[];
}) {
  const width = 900, height = 500;
  const margin = 18;
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        overflow: 'hidden',
      }}
    >
      <div className="poker-table" style={{ width, height, position: 'relative' }}>
        <svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
          {/* 统一边距 */}
          {(() => {
            const rxRatio = 0.48;
            // 外层为桌沿
            const outerX = 0;
            const outerY = 0;
            const outerW = width;
            const outerH = height;
            const outerRx = outerH * rxRatio;
            const outerRy = outerH * rxRatio;
            // 内层为桌面
            const innerX = margin;
            const innerY = margin;
            const innerW = width - margin * 2;
            const innerH = height - margin * 2;
            const innerRx = innerH * rxRatio;
            const innerRy = innerH * rxRatio;
            return <>
              {/* 桌沿：#00D8A7 */}
              <rect
                x={outerX}
                y={outerY}
                width={outerW}
                height={outerH}
                rx={outerRx}
                ry={outerRy}
                fill="#00D8A7"
              />
              {/* 桌面：#00A270 */}
              <rect
                x={innerX}
                y={innerY}
                width={innerW}
                height={innerH}
                rx={innerRx}
                ry={innerRy}
                fill="#00A270"
              />
            </>;
          })()}
        </svg>
        <div style={{
          position: 'absolute',
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, 0)',
          display: 'flex',
          gap: '16px',
        }}>
          <CommunityCards cards={communityCards} />
        </div>
        {/* 玩家座位放到桌沿外圈，手牌放到桌面内圈 */}
        {players.map((p, i) => {
          const pos = SEAT_POSITIONS[i % SEAT_POSITIONS.length];
          // 桌沿外圈位置
          const seatX = pos.x * width;
          const seatY = pos.y * height;
          const cx = width / 2, cy = height / 2;
          // 计算向外偏移（桌沿宽度+座位半径）
          const dx = seatX - cx, dy = seatY - cy;
          const len = Math.sqrt(dx*dx + dy*dy);
          const seatRadius = 36; // 玩家圆圈半径
          const extraOffset = 56; // 额外外移距离（加大）
          const offset = (width - (width - margin * 2)) / 2 + seatRadius + extraOffset;
          const px = cx + dx / len * (len + offset);
          const py = cy + dy / len * (len + offset);
          // 桌面内圈手牌位置（向内偏移）
          const handOffset = -36;
          const hx = cx + dx / len * (len + handOffset);
          const hy = cy + dy / len * (len + handOffset);
          // 假数据：每人两张手牌
          const demoCards = i === 1 ? ['A♠', 'K♥'] : ['?', '?'];
          return (
            <React.Fragment key={i}>
              {/* 桌沿外圈的玩家座位 */}
              <PlayerSeat
                name={p.name}
                chips={p.chips}
                seat={pos.seat}
                style={{
                  position: 'absolute',
                  left: px,
                  top: py,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }}
              />
              {/* 桌面内圈的手牌 */}
              <div
                style={{
                  position: 'absolute',
                  left: hx,
                  top: hy,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <PokerHand cards={demoCards} />
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
} 