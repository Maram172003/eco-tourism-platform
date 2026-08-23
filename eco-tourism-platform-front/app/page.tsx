import FeaturedExperiences from "@/components/home/FeaturedExperiences";
import Footer from "@/components/home/Footer";
import Hero from "@/components/home/Hero";
import HowItWorks from "@/components/home/HowItWorks";
import Navbar from "@/components/home/Navbar";
import Newsletter from "@/components/home/Newsletter";
import PlacesMap from "@/components/home/PlacesMap";


export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
       <Navbar variant="home" />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <PlacesMap />
        <FeaturedExperiences />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}