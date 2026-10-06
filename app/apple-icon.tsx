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
            position: 'relative',
            width: 100,
            height: 100,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 32,
              height: 88,
              background: 'white',
              borderRadius: 10,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 88,
              height: 32,
              background: 'white',
              borderRadius: 10,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
