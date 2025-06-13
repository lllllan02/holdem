interface Player {
  name: string;
  chips: number;
}

export default function PlayerSeat({
  player,
  seat,
  style = {},
  gameStatus = "waiting",
  onSit,
}: {
  player?: Player;
  seat: string;
  style?: React.CSSProperties;
  gameStatus?: string;
  onSit?: () => void;
}) {
  const isEmpty = !player;
  const canSit = isEmpty && gameStatus === "waiting";

  return (
    <div 
      className={`player-seat ${isEmpty ? 'empty' : 'occupied'}`} 
      style={{
        ...style,
        cursor: canSit ? 'pointer' : 'default',
        opacity: isEmpty && gameStatus === "playing" ? 0.5 : 1,
      }}
      onClick={canSit ? onSit : undefined}
    >
      <div className="player-seat-label">{seat}</div>
      {isEmpty ? (
        <div className="player-seat-empty">
          {gameStatus === "playing" ? "游戏中" : "点击落座"}
        </div>
      ) : (
        <>
          <div className="player-seat-name">{player.name}</div>
          <div className="player-seat-chips">{player.chips}</div>
        </>
      )}
    </div>
  );
} 