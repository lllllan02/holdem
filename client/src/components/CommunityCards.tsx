export default function CommunityCards({ cards = [] }: { cards: string[] }) {
  return (
    <div className="community-cards">
      {Array.from({ length: 5 }).map((_, i) => (
        <div className="poker-card" key={i}>
          {cards[i] ? (
            <span>{cards[i]}</span>
          ) : (
            <span style={{ color: '#bbb' }}>?</span>
          )}
        </div>
      ))}
    </div>
  );
} 