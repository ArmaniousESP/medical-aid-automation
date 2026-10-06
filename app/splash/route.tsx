import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

/** Default iPhone-class portrait splash */
const DEFAULT = { w: 1290, h: 2796 };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const w = Math.min(2000, Math.max(320, Number(searchParams.get('w')) || DEFAULT.w));
  const h = Math.min(4000, Math.max(480, Number(searchParams.get('h')) || DEFAULT.h));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#059669',
        }}
      >
        <div
          style={{
            display: 'flex',
            position: 'relative',
            width: Math.round(w * 0.22),
            height: Math.round(w * 0.22),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              width: Math.round(w * 0.07),
              height: Math.round(w * 0.18),
              background: 'white',
              borderRadius: Math.round(w * 0.02),
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: Math.round(w * 0.18),
              height: Math.round(w * 0.07),
              background: 'white',
              borderRadius: Math.round(w * 0.02),
            }}
          />
        </div>
        <div
          style={{
            marginTop: Math.round(h * 0.04),
            color: 'white',
            fontSize: Math.round(w * 0.06),
            fontWeight: 700,
            letterSpacing: '-0.02em',
          }}
        >
          Medical Aid
        </div>
        <div
          style={{
            marginTop: Math.round(h * 0.012),
            color: '#d1fae5',
            fontSize: Math.round(w * 0.032),
          }}
        >
          Monthly treatment support
        </div>
      </div>
    ),
    { width: w, height: h }
  );
}
