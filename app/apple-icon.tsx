import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#059669',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            color: 'white',
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 48, marginBottom: 4 }}>✚</span>
          <span style={{ fontSize: 28 }}>MA</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
