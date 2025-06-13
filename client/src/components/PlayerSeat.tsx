interface Player {
  name: string;
  chips: number;
}

export default function PlayerSeat({
  player,
  seat,
  style = {},
  onSit,
}: {
  player?: Player;
  seat: string;
  style?: React.CSSProperties;
  onSit?: () => void;
}) {
  const isEmpty = !player;

  return (
    <div 
      className={`player-seat ${isEmpty ? 'empty' : 'occupied'}`} 
      style={style}
      onClick={isEmpty ? onSit : undefined}
    >
      <div className="player-seat-label">{seat}</div>
      {isEmpty ? (
        <div className="player-seat-empty">点击落座</div>
      ) : (
        <>
          <div className="player-seat-name">{player.name}</div>
          <div className="player-seat-chips">{player.chips}</div>
        </>
      )}
    </div>
  );
} 