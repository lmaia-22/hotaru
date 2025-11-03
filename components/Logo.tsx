'use client';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ className = '', showText = true, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: { icon: 'w-6 h-6', text: 'text-lg', gap: 'gap-2' },
    md: { icon: 'w-8 h-8', text: 'text-xl', gap: 'gap-3' },
    lg: { icon: 'w-12 h-12', text: 'text-3xl', gap: 'gap-4' },
  };

  const { icon: iconSize, text: textSize, gap } = sizeClasses[size];

  return (
    <div className={`flex items-center ${gap} ${className}`}>
      {/* Firefly Icon */}
      <svg
        className={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer glow effect */}
        <ellipse cx="24" cy="36" rx="8" ry="10" fill="#FCD34D" opacity="0.2" />
        
        {/* Firefly body - dark gray/black pear shape */}
        {/* Upper body/head */}
        <ellipse cx="24" cy="20" rx="7" ry="10" fill="#374151" className="dark:fill-gray-900" />
        
        {/* Antennae */}
        <path
          d="M20 12 Q18 6, 15 8"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="dark:stroke-gray-900"
        />
        <path
          d="M28 12 Q30 6, 33 8"
          stroke="#374151"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="dark:stroke-gray-900"
        />
        
        {/* Glowing abdomen - bright yellow/amber with inner glow */}
        {/* Outer glow */}
        <ellipse cx="24" cy="36" rx="7" ry="9" fill="#FCD34D" opacity="0.4">
          <animate
            attributeName="opacity"
            values="0.4;0.6;0.4"
            dur="2s"
            repeatCount="indefinite"
          />
        </ellipse>
        {/* Main glowing abdomen */}
        <ellipse cx="24" cy="36" rx="6" ry="8" fill="#FCD34D" />
        {/* Inner bright core */}
        <ellipse cx="24" cy="36" rx="4" ry="6" fill="#FDE047" />
      </svg>

      {/* Text */}
      {showText && (
        <span className={`font-sans font-normal lowercase text-gray-900 dark:text-gray-100 ${textSize}`}>
          hotaru
        </span>
      )}
    </div>
  );
}

