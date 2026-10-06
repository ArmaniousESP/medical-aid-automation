import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Home-screen / favicon icon — emerald cross + MA mark */
export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: 180,
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.04em',
          }}
        >
          <span style={{ fontSize: 120, marginBottom: 8 }}>✚</span>
          <span style={{ fontSize: 72, fontWeight: 600 }}>MA</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
