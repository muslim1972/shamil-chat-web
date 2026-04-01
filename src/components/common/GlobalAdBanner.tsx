import { useNavigate, useLocation } from 'react-router-dom';

interface GlobalAdBannerProps {
    isKeyboardVisible?: boolean;
}

/**
 * حاوية الإعلان العالمية - تظهر أسفل جميع الواجهات
 * يمكن تخصيص الرابط والنص حسب الحاجة
 * تختفي تماماً عند ظهور الكيبورد حتى لا تدفع حقل الكتابة للأعلى
 */
export const GlobalAdBanner = ({ isKeyboardVisible = false }: GlobalAdBannerProps) => {
    const navigate = useNavigate();
    const location = useLocation();

    // لا تظهر في صفحة الإعلان نفسها
    if (location.pathname === '/shagram/ad') {
        return null;
    }

    // إخفاء الإعلان تماماً عند ظهور الكيبورد
    // بهذه الطريقة يبقى الإعلان في مكانه ويغطيه الكيبورد
    if (isKeyboardVisible) {
        return null;
    }

    const handleAdClick = (e: React.MouseEvent) => {
        e.preventDefault();
        navigate('/shagram/ad');
    };

    return (
        <div className="w-full bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-cyan-900/90 backdrop-blur-sm border-t border-white/10 flex-shrink-0">
            <a
                href="/shagram/ad"
                className="block w-full py-2.5 px-4 text-center hover:bg-white/5 transition-colors"
                onClick={handleAdClick}
            >
                <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-400">إعلان</span>
                    <span className="text-white text-sm sm:text-base font-medium">🚀 تطبيق شامل - كل ما تحتاجه في مكان واحد!</span>
                </div>
                <p className="text-xs text-gray-300 mt-0.5">اضغط للمزيد من المعلومات</p>
            </a>
        </div>
    );
};

export default GlobalAdBanner;
