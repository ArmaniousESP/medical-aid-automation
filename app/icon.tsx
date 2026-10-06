import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

/** Home-screen / browser icon */
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
        {/* Medical cross */}
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: 280,
            height: 280,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: 88,
              height: 240,
              background: 'white',
              borderRadius: 24,
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: 240,
              height: 88,
              background: 'white',
              borderRadius: 24,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
