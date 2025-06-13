export default function PlayerSeat({
  name,
  chips,
  seat,
  style = {},
}: {
  name: string;
  chips: number;
  seat: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className="player-seat" style={style}>
      <div className="player-seat-label">{seat}</div>
      <div className="player-seat-name">{name}</div>
      <div className="player-seat-chips">{chips}</div>
    </div>
  );
} 