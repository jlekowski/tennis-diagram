const TEAM_FILL = {
  A: "#2563eb",
  B: "#dc2626",
};

export const PLAYER_RADIUS = 14;

/**
 * Render a player label, treating a trailing lowercase 'p' as a subscript
 * (textbook convention: S/Sₚ for Server/Server's partner, R/Rₚ for Receiver/partner).
 */
function renderPlayerLabel(label) {
  if (/^[A-Z]p$/.test(label)) {
    return (
      <>
        {label[0]}
        <tspan fontSize="8" dy="2">p</tspan>
      </>
    );
  }
  return label;
}

export default function Player({ player, onPointerDown, dimmed }) {
  return (
    <g
      onPointerDown={onPointerDown}
      style={{ cursor: "grab", opacity: dimmed ? 0.5 : 1 }}
      data-player-id={player.id}
    >
      <circle
        cx={player.x}
        cy={player.y}
        r={PLAYER_RADIUS}
        fill={TEAM_FILL[player.team]}
        stroke="#ffffff"
        strokeWidth="2"
      />
      <text
        x={player.x}
        y={player.y + 4}
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="#ffffff"
        fontFamily="sans-serif"
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {renderPlayerLabel(player.label)}
      </text>
    </g>
  );
}
