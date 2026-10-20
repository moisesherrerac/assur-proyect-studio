import React from 'react';

interface AssurLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const AssurLogo: React.FC<AssurLogoProps> = ({
  className = 'w-8 h-8',
  size,
  showText = false
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${showText ? '' : 'inline-flex'}`}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={size ? { width: size, height: size } : undefined}
      >
        <mask id="assur-hex-mask">
          <rect width="100" height="100" fill="white" />
          {/* Central hexagon hole */}
          <polygon
            points="50,33.5 64.3,41.75 64.3,58.25 50,66.5 35.7,58.25 35.7,41.75"
            fill="black"
          />
          {/* 6 radial divider lines */}
          <line x1="50" y1="33.5" x2="50" y2="3.5" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="64.3" y1="41.75" x2="90.3" y2="26.75" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="64.3" y1="58.25" x2="90.3" y2="73.25" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="50" y1="66.5" x2="50" y2="96.5" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="35.7" y1="58.25" x2="9.7" y2="73.25" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
          <line x1="35.7" y1="41.75" x2="9.7" y2="26.75" stroke="black" strokeWidth="2.8" strokeLinecap="round" />
        </mask>

        {/* Solid outer hexagon rendered with the mask */}
        <polygon
          points="50,3.5 90.3,26.75 90.3,73.25 50,96.5 9.7,73.25 9.7,26.75"
          fill="#5B06E0"
          mask="url(#assur-hex-mask)"
        />
      </svg>
      {showText && (
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-slate-900 leading-none">
            Assur Proyect Studio
          </span>
          <span className="text-[10px] font-mono font-semibold tracking-wider text-purple-700 mt-0.5">
            INGENIERÍA & CAD
          </span>
        </div>
      )}
    </div>
  );
};
