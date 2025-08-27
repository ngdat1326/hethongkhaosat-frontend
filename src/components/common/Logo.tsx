import * as React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxlm';
    showText?: boolean;
    className?: string;
    imageUrl?: string; // URL của logo ảnh
}

const Logo: React.FC<LogoProps> = ({
    size = 'md',
    showText = true,
    className = '',
    imageUrl = "/public/image/logo.png"
}) => {

    // Cấu hình kích thước responsive
    const sizeConfig = {
        sm: {
            container: 'h-8 w-8 sm:h-10 sm:w-10',
            text: 'text-sm sm:text-base',
            emoji: 'text-lg sm:text-xl'
        },
        md: {
            container: 'h-10 w-10 sm:h-12 sm:w-12',
            text: 'text-base sm:text-lg',
            emoji: 'text-xl sm:text-2xl'
        },
        lg: {
            container: 'h-12 w-12 sm:h-16 sm:w-16',
            text: 'text-lg sm:text-xl',
            emoji: 'text-2xl sm:text-3xl'
        },
        xl: {
            container: 'h-16 w-16 sm:h-20 sm:w-20',
            text: 'text-xl sm:text-2xl',
            emoji: 'text-3xl sm:text-4xl'
        },
        xxl: {
            container: 'h-24 w-24 sm:h-32 sm:w-32',
            text: 'text-3xl sm:text-4xl',
            emoji: 'text-5xl sm:text-6xl'
        },
        xxlm: {
            container: 'h-20 w-20 sm:h-24 sm:w-24',
            text: 'text-2xl sm:text-3xl',
            emoji: 'text-4xl sm:text-5xl'
        }
    };

    const config = sizeConfig[size] || sizeConfig['md'];

    return (
        <div className={`flex items-center space-x-2 sm:space-x-3 ${className}`}>
            {/* Logo Container - Responsive và không bị tràn */}
            <div className={`logo-container ${config.container} flex-shrink-0 relative ${className.includes('animate-bounce') ? 'animate-bounce' : ''}`}> {/* Chỉ animate-bounce nếu truyền className */}
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt="Logo Bệnh viện"
                        className="w-full h-full object-cover p-1"
                        onError={(e) => {
                            // Fallback về emoji nếu ảnh lỗi
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                                parent.innerHTML = `<div class='w-full h-full flex items-center justify-center ${config.emoji}'>🏥</div>`;
                            }
                        }}
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center ${config.emoji}`}></div>
                )}
            </div>

            {/* Text - Responsive và có thể ẩn */}
            {showText && (
                <div className="min-w-0 flex-1">
                    <h1 className={`${config.text} font-bold text-gray-900 truncate leading-tight`}>
                        BỆNH VIỆN TRUNG ƯƠNG QUÂN ĐỘI 108
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 truncate leading-tight">
                        Chăm sóc sức khỏe
                    </p>
                </div>
            )}
        </div>
    );
};

export default Logo;