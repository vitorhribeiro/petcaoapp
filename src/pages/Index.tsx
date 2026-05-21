import { useIsMobile } from '@/hooks/useIsMobile';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/sections/HeroSection';
import { ProblemSolutionSection } from '@/components/sections/ProblemSolutionSection';
import { ServicesSection } from '@/components/sections/ServicesSection';
import { PackagesSection } from '@/components/sections/PackagesSection';
import { PricingSection } from '@/components/sections/PricingSection';
import { CalendarSection } from '@/components/sections/CalendarSection';
import { GallerySection } from '@/components/sections/GallerySection';
import { StickerAlbumSection } from '@/components/sections/StickerAlbumSection';
import { ReviewsSection } from '@/components/sections/ReviewsSection';
import { LocationSection } from '@/components/sections/LocationSection';
import { CTASection } from '@/components/sections/CTASection';

function IndexContent() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-glow">
      <Header />

      <main>
        <HeroSection />
        <StickerAlbumSection />
        <ProblemSolutionSection />
        <ServicesSection />
        <PackagesSection />
        <CalendarSection onOpenLogin={() => navigate('/auth/login')} />
        <GallerySection />
        <ReviewsSection />
        <LocationSection />
        <CTASection />
      </main>

      <Footer />
      {isMobile && <BottomNav />}
    </div>
  );
}

const Index = () => <IndexContent />;

export default Index;
