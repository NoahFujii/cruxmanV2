import { useState } from 'react';
import BoulderWallVisual from '../components/BoulderWallVisual';

export default function WallPreview() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ width: '100vw', height: '100vh', background: '#1A1A1E', overflow: 'hidden' }}
    >
      <BoulderWallVisual hovered={hovered} dark />
    </div>
  );
}
