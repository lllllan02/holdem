export default function CommunityCards() {
  return (
    <div className="community-cards">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="poker-card empty-card" key={i}>
          {/* 空边框，等游戏开始时显示扑克牌 */}
        </div>
      ))}
    </div>
  );
} 