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



interface Player {
  name: string;
  chips: number;
}

export default function PokerTable({
  seatedPlayers = {},
  onSit,
}: {
  seatedPlayers?: { [seat: string]: Player };
  onSit?: (seat: string) => void;
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
          <CommunityCards />
        </div>
        {/* 玩家座位放到桌沿外圈，手牌放到桌面内圈 */}
        {SEAT_POSITIONS.map((pos, i) => {
          const cx = width / 2, cy = height / 2;
          
          // 重新设计整齐的布局
          let px, py, hx, hy;
          
          switch (pos.seat) {
            case '上1': // LJ
              px = width * 0.32;
              py = -80; // 完全移到桌面外上方
              hx = width * 0.32;
              hy = 100; // 手牌确保在桌面内
              break;
            case '上2': // MP  
              px = width * 0.50;
              py = -80; // 完全移到桌面外上方
              hx = width * 0.50;
              hy = 100; // 手牌确保在桌面内
              break;
            case '上3': // SB
              px = width * 0.68;
              py = -80; // 完全移到桌面外上方
              hx = width * 0.68;
              hy = 100; // 手牌确保在桌面内
              break;
            case '右1': // BB
              px = width + 80; // 完全移到桌面外右侧
              py = height * 0.32;
              hx = width - 120; // 手牌确保在桌面内
              hy = height * 0.32;
              break;
            case '右2': // UTG
              px = width + 80; // 完全移到桌面外右侧
              py = height * 0.68;
              hx = width - 120; // 手牌确保在桌面内
              hy = height * 0.68;
              break;
            case '自己': // UTG+1
              px = width * 0.50;
              py = height + 80; // 完全移到桌面外下方
              hx = width * 0.50;
              hy = height - 100; // 手牌确保在桌面内
              break;
            case '左1': // UTG+2
              px = -80; // 完全移到桌面外左侧
              py = height * 0.32;
              hx = 120; // 手牌确保在桌面内
              hy = height * 0.32;
              break;
            case '左2': // HJ
              px = -80; // 完全移到桌面外左侧
              py = height * 0.68;
              hx = 120; // 手牌确保在桌面内
              hy = height * 0.68;
              break;
            default:
              px = cx;
              py = cy;
              hx = cx;
              hy = cy;
          }
          // 获取该座位的玩家信息
          const player = seatedPlayers[pos.seat];
          return (
            <React.Fragment key={i}>
              {/* 桌沿外圈的玩家座位 */}
              <PlayerSeat
                player={player}
                seat={pos.seat}
                onSit={() => onSit?.(pos.seat)}
                style={{
                  position: 'absolute',
                  left: px,
                  top: py,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }}
              />
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
} 